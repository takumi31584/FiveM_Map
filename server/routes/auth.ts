import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { compareSync, hashSync } from 'bcryptjs'
import { randomUUID } from 'crypto'
import { getDb } from '../db/index.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const auth = new Hono()

// Signup (account request - status = pending)
auth.post('/signup', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()
  if (!username || !password) return c.json({ error: 'ユーザー名とパスワードを入力してください' }, 400)
  if (username.length < 2) return c.json({ error: 'ユーザー名は2文字以上にしてください' }, 400)
  if (password.length < 4) return c.json({ error: 'パスワードは4文字以上にしてください' }, 400)

  const db = getDb()
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exists) return c.json({ error: 'このユーザー名は既に使われています' }, 409)

  const hash = hashSync(password, 10)
  db.prepare('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)').run(
    username, hash, 'user', 'pending',
  )

  return c.json({ message: 'アカウント申請を送信しました。管理者の承認をお待ちください。' }, 201)
})

// Login (only approved users)
auth.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()
  const db = getDb()

  const user = db.prepare('SELECT id, username, password_hash, role, status FROM users WHERE username = ?').get(username) as
    | { id: number; username: string; password_hash: string; role: string; status: string }
    | undefined

  if (!user || !compareSync(password, user.password_hash)) {
    return c.json({ error: 'ユーザー名またはパスワードが違います' }, 401)
  }

  if (user.status === 'pending') {
    return c.json({ error: 'アカウントは承認待ちです。管理者の承認をお待ちください。' }, 403)
  }
  if (user.status === 'rejected') {
    return c.json({ error: 'アカウント申請が拒否されました。' }, 403)
  }

  const sessionId = randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    sessionId, user.id, expiresAt,
  )

  setCookie(c, 'session', sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    maxAge: 30 * 24 * 60 * 60,
  })

  return c.json({ id: user.id, username: user.username, role: user.role })
})

auth.post('/logout', async (c) => {
  deleteCookie(c, 'session', { path: '/' })
  return c.json({ ok: true })
})

auth.get('/me', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ user: null })
  return c.json({ user })
})

// Admin: list all users (with status)
auth.get('/users', requireAuth, requireAdmin, async (c) => {
  const db = getDb()
  const users = db.prepare('SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC').all()
  return c.json(users)
})

// Admin: create user (pre-approved)
auth.post('/users', requireAuth, requireAdmin, async (c) => {
  const { username, password, role } = await c.req.json<{
    username: string; password: string; role?: string
  }>()
  const db = getDb()

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exists) return c.json({ error: 'ユーザー名は既に使用されています' }, 409)

  const hash = hashSync(password, 10)
  const result = db
    .prepare('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)')
    .run(username, hash, role ?? 'user', 'approved')

  return c.json({ id: result.lastInsertRowid, username, role: role ?? 'user', status: 'approved' }, 201)
})

// Admin: update user role
auth.put('/users/:id/role', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user')!
  if (user.id === id) return c.json({ error: '自分自身のロールは変更できません' }, 400)
  const { role } = await c.req.json<{ role: string }>()
  if (role !== 'admin' && role !== 'user') return c.json({ error: '無効なロールです' }, 400)
  const db = getDb()
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
  return c.json({ ok: true })
})

// Admin: approve user
auth.put('/users/:id/approve', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb()
  db.prepare("UPDATE users SET status = 'approved' WHERE id = ?").run(id)
  return c.json({ ok: true })
})

// Admin: reject user
auth.put('/users/:id/reject', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb()
  db.prepare("UPDATE users SET status = 'rejected' WHERE id = ?").run(id)
  return c.json({ ok: true })
})

// Admin: delete user
auth.delete('/users/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const user = c.get('user')!
  if (user.id === id) return c.json({ error: '自分自身は削除できません' }, 400)

  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id)
  db.prepare('DELETE FROM markers WHERE user_id = ?').run(id)
  db.prepare('DELETE FROM users WHERE id = ?').run(id)
  return c.json({ ok: true })
})

export default auth
