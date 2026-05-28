import { Hono } from 'hono'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import { compareSync, hashSync } from 'bcryptjs'
import { randomUUID } from 'crypto'
import { getDb } from '../db/index.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const MAX_USERNAME_LEN = 32
const MIN_PASSWORD_LEN = 8

// Rate limiting
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(key)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  entry.count++
  return entry.count <= 10
}

const auth = new Hono()

auth.post('/signup', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()
  if (!username || !password) return c.json({ error: 'ユーザー名とパスワードを入力してください' }, 400)
  if (username.length < 2 || username.length > MAX_USERNAME_LEN) return c.json({ error: `ユーザー名は2~${MAX_USERNAME_LEN}文字にしてください` }, 400)
  if (password.length < MIN_PASSWORD_LEN) return c.json({ error: `パスワードは${MIN_PASSWORD_LEN}文字以上にしてください` }, 400)

  const db = getDb()
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exists) return c.json({ error: 'このユーザー名は既に使われています' }, 409)

  const hash = hashSync(password, 10)
  db.prepare('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)').run(username, hash, 'user', 'pending')
  return c.json({ message: 'アカウント申請を送信しました。管理者の承認をお待ちください。' }, 201)
})

auth.post('/login', async (c) => {
  const ip = c.req.header('x-forwarded-for') ?? 'local'
  if (!checkRateLimit(ip)) {
    return c.json({ error: 'ログイン試行回数の上限に達しました。15分後に再試行してください。' }, 429)
  }

  const { username, password } = await c.req.json<{ username: string; password: string }>()
  const db = getDb()

  const user = db.prepare('SELECT id, username, password_hash, role, status FROM users WHERE username = ?').get(username) as
    | { id: number; username: string; password_hash: string; role: string; status: string }
    | undefined

  if (!user || !compareSync(password, user.password_hash)) {
    return c.json({ error: 'ユーザー名またはパスワードが違います' }, 401)
  }
  if (user.status === 'pending') return c.json({ error: 'アカウントは承認待ちです。管理者の承認をお待ちください。' }, 403)
  if (user.status === 'rejected') return c.json({ error: 'アカウント申請が拒否されました。' }, 403)

  const sessionId = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, user.id, expiresAt)

  // Cleanup expired sessions
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run()

  setCookie(c, 'session', sessionId, { path: '/', httpOnly: true, sameSite: 'Lax', maxAge: 7 * 24 * 60 * 60 })
  return c.json({ id: user.id, username: user.username, role: user.role })
})

auth.post('/logout', async (c) => {
  const sessionId = getCookie(c, 'session')
  if (sessionId) {
    const db = getDb()
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
  }
  deleteCookie(c, 'session', { path: '/', sameSite: 'Lax' })
  return c.json({ ok: true })
})

auth.get('/me', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ user: null })
  return c.json({ user })
})

auth.get('/users', requireAuth, requireAdmin, async (c) => {
  const db = getDb()
  const users = db.prepare('SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC').all()
  return c.json(users)
})

auth.post('/users', requireAuth, requireAdmin, async (c) => {
  const { username, password, role } = await c.req.json<{ username: string; password: string; role?: string }>()
  if (!username || username.length > MAX_USERNAME_LEN) return c.json({ error: 'ユーザー名が不正です' }, 400)
  if (!password || password.length < MIN_PASSWORD_LEN) return c.json({ error: `パスワードは${MIN_PASSWORD_LEN}文字以上にしてください` }, 400)
  const validRole = role === 'admin' ? 'admin' : 'user'

  const db = getDb()
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exists) return c.json({ error: 'ユーザー名は既に使用されています' }, 409)

  const hash = hashSync(password, 10)
  const result = db.prepare('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)').run(username, hash, validRole, 'approved')
  return c.json({ id: result.lastInsertRowid, username, role: validRole, status: 'approved' }, 201)
})

auth.put('/users/:id/role', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: '無効なIDです' }, 400)
  const user = c.get('user')!
  if (user.id === id) return c.json({ error: '自分自身のロールは変更できません' }, 400)
  const { role } = await c.req.json<{ role: string }>()
  if (role !== 'admin' && role !== 'user') return c.json({ error: '無効なロールです' }, 400)
  const db = getDb()
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
  return c.json({ ok: true })
})

auth.put('/users/:id/approve', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: '無効なIDです' }, 400)
  const db = getDb()
  db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").run(id)
  return c.json({ ok: true })
})

auth.put('/users/:id/reject', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: '無効なIDです' }, 400)
  const db = getDb()
  db.prepare("UPDATE users SET status = 'rejected' WHERE id = ?").run(id)
  return c.json({ ok: true })
})

auth.delete('/users/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: '無効なIDです' }, 400)
  const user = c.get('user')!
  if (user.id === id) return c.json({ error: '自分自身は削除できません' }, 400)

  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id)
  db.prepare('DELETE FROM markers WHERE user_id = ?').run(id)
  db.prepare('DELETE FROM users WHERE id = ?').run(id)
  return c.json({ ok: true })
})

export default auth
