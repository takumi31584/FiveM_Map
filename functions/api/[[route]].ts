import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { handle } from 'hono/cloudflare-pages'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
}

type Variables = {
  user: { id: number; username: string; role: string } | null
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api')

// ---- helpers ----
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'fivem-map-salt-v1')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ---- middleware ----
app.use('*', async (c, next) => {
  const sessionId = getCookie(c, 'session')
  if (!sessionId) { c.set('user', null); return next() }

  const row = await c.env.DB.prepare(
    `SELECT s.user_id, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime('now')`
  ).bind(sessionId).first<{ user_id: number; username: string; role: string }>()

  c.set('user', row ? { id: row.user_id, username: row.username, role: row.role } : null)
  return next()
})

function requireAuth(c: any, next: any) {
  if (!c.get('user')) return c.json({ error: 'Unauthorized' }, 401)
  return next()
}

function requireAdmin(c: any, next: any) {
  const user = c.get('user')
  if (!user || user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  return next()
}

// ---- Auth ----
app.post('/auth/signup', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()
  if (!username || !password) return c.json({ error: 'ユーザー名とパスワードを入力してください' }, 400)
  if (username.length < 2) return c.json({ error: 'ユーザー名は2文字以上にしてください' }, 400)
  if (password.length < 4) return c.json({ error: 'パスワードは4文字以上にしてください' }, 400)

  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (exists) return c.json({ error: 'このユーザー名は既に使われています' }, 409)

  const hash = await hashPassword(password)
  await c.env.DB.prepare('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)').bind(username, hash, 'user', 'pending').run()
  return c.json({ message: 'アカウント申請を送信しました。管理者の承認をお待ちください。' }, 201)
})

app.post('/auth/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()
  const hash = await hashPassword(password)

  const user = await c.env.DB.prepare('SELECT id, username, role, status FROM users WHERE username = ? AND password_hash = ?').bind(username, hash).first<{ id: number; username: string; role: string; status: string }>()
  if (!user) return c.json({ error: 'ユーザー名またはパスワードが違います' }, 401)
  if (user.status === 'pending') return c.json({ error: 'アカウントは承認待ちです。管理者の承認をお待ちください。' }, 403)
  if (user.status === 'rejected') return c.json({ error: 'アカウント申請が拒否されました。' }, 403)

  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(sessionId, user.id, expiresAt).run()

  setCookie(c, 'session', sessionId, { path: '/', httpOnly: true, sameSite: 'Lax', maxAge: 30 * 24 * 60 * 60 })
  return c.json({ id: user.id, username: user.username, role: user.role })
})

app.post('/auth/logout', async (c) => {
  deleteCookie(c, 'session', { path: '/' })
  return c.json({ ok: true })
})

app.get('/auth/me', async (c) => {
  return c.json({ user: c.get('user') })
})

app.get('/auth/users', requireAuth, requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC').all()
  return c.json(results)
})

app.post('/auth/users', requireAuth, requireAdmin, async (c) => {
  const { username, password, role } = await c.req.json<{ username: string; password: string; role?: string }>()
  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
  if (exists) return c.json({ error: 'ユーザー名は既に使用されています' }, 409)

  const hash = await hashPassword(password)
  const r = await c.env.DB.prepare('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)').bind(username, hash, role ?? 'user', 'approved').run()
  return c.json({ id: r.meta.last_row_id, username, role: role ?? 'user', status: 'approved' }, 201)
})

app.put('/auth/users/:id/role', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user')!
  if (user.id === id) return c.json({ error: '自分自身のロールは変更できません' }, 400)
  const { role } = await c.req.json<{ role: string }>()
  if (role !== 'admin' && role !== 'user') return c.json({ error: '無効なロールです' }, 400)
  await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run()
  return c.json({ ok: true })
})

app.put('/auth/users/:id/approve', requireAuth, requireAdmin, async (c) => {
  await c.env.DB.prepare("UPDATE users SET status = 'approved' WHERE id = ?").bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

app.put('/auth/users/:id/reject', requireAuth, requireAdmin, async (c) => {
  await c.env.DB.prepare("UPDATE users SET status = 'rejected' WHERE id = ?").bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

app.delete('/auth/users/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user')!
  if (user.id === id) return c.json({ error: '自分自身は削除できません' }, 400)
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM markers WHERE user_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ])
  return c.json({ ok: true })
})

// ---- Categories ----
app.get('/categories', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all()
  return c.json(results)
})

app.post('/categories', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<{ key: string; label: string; color: string; icon: string; sort_order?: number }>()
  const exists = await c.env.DB.prepare('SELECT id FROM categories WHERE key = ?').bind(body.key).first()
  if (exists) return c.json({ error: 'このキーは既に使われています' }, 409)
  const maxSort = await c.env.DB.prepare('SELECT MAX(sort_order) as max FROM categories').first<{ max: number | null }>()
  const sortOrder = body.sort_order ?? (maxSort?.max ?? 0) + 1
  const r = await c.env.DB.prepare('INSERT INTO categories (key, label, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)').bind(body.key, body.label, body.color, body.icon, sortOrder).run()
  return c.json({ id: r.meta.last_row_id, ...body, sort_order: sortOrder }, 201)
})

app.put('/categories/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ label?: string; color?: string; icon?: string; sort_order?: number }>()
  const sets: string[] = []; const vals: unknown[] = []
  if (body.label !== undefined) { sets.push('label = ?'); vals.push(body.label) }
  if (body.color !== undefined) { sets.push('color = ?'); vals.push(body.color) }
  if (body.icon !== undefined) { sets.push('icon = ?'); vals.push(body.icon) }
  if (body.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(body.sort_order) }
  if (sets.length === 0) return c.json({ error: 'No fields' }, 400)
  vals.push(id)
  await c.env.DB.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
  const updated = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()
  return c.json(updated)
})

app.delete('/categories/:id', requireAuth, requireAdmin, async (c) => {
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

// ---- Markers ----
app.get('/markers', requireAuth, async (c) => {
  const user = c.get('user')!
  const { results } = await c.env.DB.prepare(
    `SELECT m.id, m.user_id, m.position_x, m.position_y, m.title, m.memo, m.category_key, m.is_shared, m.created_at, m.updated_at, u.username as author
     FROM markers m JOIN users u ON m.user_id = u.id WHERE m.is_shared = 1 OR m.user_id = ? ORDER BY m.created_at DESC`
  ).bind(user.id).all()
  return c.json(results)
})

app.post('/markers', requireAuth, async (c) => {
  const user = c.get('user')!
  const body = await c.req.json<{ position_x: number; position_y: number; title: string; memo: string; category_key: string; is_shared?: boolean }>()
  const isShared = user.role === 'admin' && body.is_shared !== false ? 1 : 0
  const now = new Date().toISOString()
  const r = await c.env.DB.prepare(
    'INSERT INTO markers (user_id, position_x, position_y, title, memo, category_key, is_shared, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(user.id, body.position_x, body.position_y, body.title, body.memo, body.category_key, isShared, now, now).run()
  return c.json({ id: r.meta.last_row_id, user_id: user.id, position_x: body.position_x, position_y: body.position_y, title: body.title, memo: body.memo, category_key: body.category_key, is_shared: isShared, author: user.username, created_at: now, updated_at: now }, 201)
})

app.put('/markers/:id', requireAuth, async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT user_id FROM markers WHERE id = ?').bind(id).first<{ user_id: number }>()
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (existing.user_id !== user.id && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  const body = await c.req.json<{ title?: string; memo?: string; category_key?: string; is_shared?: boolean; position_x?: number; position_y?: number }>()
  const sets: string[] = []; const vals: unknown[] = []
  if (body.title !== undefined) { sets.push('title = ?'); vals.push(body.title) }
  if (body.memo !== undefined) { sets.push('memo = ?'); vals.push(body.memo) }
  if (body.category_key !== undefined) { sets.push('category_key = ?'); vals.push(body.category_key) }
  if (body.position_x !== undefined) { sets.push('position_x = ?'); vals.push(body.position_x) }
  if (body.position_y !== undefined) { sets.push('position_y = ?'); vals.push(body.position_y) }
  if (body.is_shared !== undefined && user.role === 'admin') { sets.push('is_shared = ?'); vals.push(body.is_shared ? 1 : 0) }
  if (sets.length === 0) return c.json({ error: 'No fields' }, 400)
  sets.push("updated_at = datetime('now')")
  vals.push(id)
  await c.env.DB.prepare(`UPDATE markers SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
  const updated = await c.env.DB.prepare('SELECT m.*, u.username as author FROM markers m JOIN users u ON m.user_id = u.id WHERE m.id = ?').bind(id).first()
  return c.json(updated)
})

app.delete('/markers/:id', requireAuth, async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const existing = await c.env.DB.prepare('SELECT user_id FROM markers WHERE id = ?').bind(id).first<{ user_id: number }>()
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (existing.user_id !== user.id && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  await c.env.DB.prepare('DELETE FROM markers WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// ---- Uploads (R2) ----
app.post('/uploads/:markerId', requireAuth, async (c) => {
  const markerId = Number(c.req.param('markerId'))
  const marker = await c.env.DB.prepare('SELECT id FROM markers WHERE id = ?').bind(markerId).first()
  if (!marker) return c.json({ error: 'Marker not found' }, 404)

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'ファイルが必要です' }, 400)

  const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'])
  if (!allowed.has(file.type)) return c.json({ error: '対応形式: JPG, PNG, GIF, WebP, MP4, WebM' }, 400)
  if (file.size > 20 * 1024 * 1024) return c.json({ error: 'ファイルサイズは20MB以下にしてください' }, 400)

  const ext = file.name.split('.').pop() || 'bin'
  const filename = `${crypto.randomUUID()}.${ext}`

  await c.env.R2.put(filename, file.stream(), { httpMetadata: { contentType: file.type } })

  const r = await c.env.DB.prepare('INSERT INTO attachments (marker_id, filename, original_name, mime_type) VALUES (?, ?, ?, ?)').bind(markerId, filename, file.name, file.type).run()
  return c.json({ id: r.meta.last_row_id, marker_id: markerId, filename, original_name: file.name, mime_type: file.type, url: `/api/uploads/file/${filename}` }, 201)
})

app.get('/uploads/file/:filename', async (c) => {
  const filename = c.req.param('filename')
  const object = await c.env.R2.get(filename)
  if (!object) return c.json({ error: 'Not found' }, 404)

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream')
  headers.set('Cache-Control', 'public, max-age=31536000')
  return new Response(object.body, { headers })
})

app.get('/uploads/:markerId', async (c) => {
  const markerId = Number(c.req.param('markerId'))
  const { results } = await c.env.DB.prepare('SELECT id, filename, original_name, mime_type, created_at FROM attachments WHERE marker_id = ? ORDER BY created_at ASC').bind(markerId).all()
  const mapped = (results as { id: number; filename: string; original_name: string; mime_type: string; created_at: string }[]).map(r => ({ ...r, url: `/api/uploads/file/${r.filename}` }))
  return c.json(mapped)
})

app.delete('/uploads/attachment/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'))
  const att = await c.env.DB.prepare('SELECT filename FROM attachments WHERE id = ?').bind(id).first<{ filename: string }>()
  if (!att) return c.json({ error: 'Not found' }, 404)
  await c.env.R2.delete(att.filename)
  await c.env.DB.prepare('DELETE FROM attachments WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export const onRequest = handle(app)
