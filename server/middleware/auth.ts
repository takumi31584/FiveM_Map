import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { getDb } from '../db/index.js'

interface SessionUser {
  id: number
  username: string
  role: string
}

declare module 'hono' {
  interface ContextVariableMap {
    user: SessionUser | null
  }
}

export const sessionMiddleware = createMiddleware(async (c, next) => {
  const sessionId = getCookie(c, 'session')
  if (!sessionId) {
    c.set('user', null)
    return next()
  }

  const db = getDb()
  const row = db
    .prepare(
      `SELECT s.user_id, u.username, u.role
       FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.expires_at > datetime('now')`,
    )
    .get(sessionId) as { user_id: number; username: string; role: string } | undefined

  if (row) {
    c.set('user', { id: row.user_id, username: row.username, role: row.role })
  } else {
    c.set('user', null)
  }
  return next()
})

export const requireAuth = createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return next()
})

export const requireAdmin = createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  return next()
})
