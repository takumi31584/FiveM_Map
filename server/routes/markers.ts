import { Hono } from 'hono'
import { getDb } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const markers = new Hono()

// GET: shared markers + own markers
markers.get('/', requireAuth, async (c) => {
  const user = c.get('user')!
  const db = getDb()

  const rows = db
    .prepare(
      `SELECT m.id, m.user_id, m.position_x, m.position_y, m.title, m.memo,
              m.category_key, m.is_shared, m.created_at, m.updated_at,
              u.username as author
       FROM markers m JOIN users u ON m.user_id = u.id
       WHERE m.is_shared = 1 OR m.user_id = ?
       ORDER BY m.created_at DESC`,
    )
    .all(user.id)

  return c.json(rows)
})

// POST: create marker
markers.post('/', requireAuth, async (c) => {
  const user = c.get('user')!
  const body = await c.req.json<{
    position_x: number
    position_y: number
    title: string
    memo: string
    category_key: string
    is_shared?: boolean
  }>()

  // Only admins can create shared markers
  const isShared = user.role === 'admin' && body.is_shared === true ? 1 : 0

  const db = getDb()
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO markers (user_id, position_x, position_y, title, memo, category_key, is_shared, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(user.id, body.position_x, body.position_y, body.title, body.memo, body.category_key, isShared, now, now)

  return c.json(
    {
      id: result.lastInsertRowid,
      user_id: user.id,
      position_x: body.position_x,
      position_y: body.position_y,
      title: body.title,
      memo: body.memo,
      category_key: body.category_key,
      is_shared: isShared,
      author: user.username,
      created_at: now,
      updated_at: now,
    },
    201,
  )
})

// PUT: update marker (own or admin)
markers.put('/:id', requireAuth, async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const db = getDb()

  const existing = db.prepare('SELECT user_id FROM markers WHERE id = ?').get(id) as
    | { user_id: number }
    | undefined
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (existing.user_id !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = await c.req.json<{
    title?: string
    memo?: string
    category_key?: string
    is_shared?: boolean
    position_x?: number
    position_y?: number
  }>()

  const sets: string[] = []
  const vals: unknown[] = []

  if (body.title !== undefined) { sets.push('title = ?'); vals.push(body.title) }
  if (body.memo !== undefined) { sets.push('memo = ?'); vals.push(body.memo) }
  if (body.category_key !== undefined) { sets.push('category_key = ?'); vals.push(body.category_key) }
  if (body.position_x !== undefined) { sets.push('position_x = ?'); vals.push(body.position_x) }
  if (body.position_y !== undefined) { sets.push('position_y = ?'); vals.push(body.position_y) }
  if (body.is_shared !== undefined && user.role === 'admin') {
    sets.push('is_shared = ?')
    vals.push(body.is_shared ? 1 : 0)
  }

  if (sets.length === 0) return c.json({ error: 'No fields to update' }, 400)

  sets.push("updated_at = datetime('now')")
  vals.push(id)

  db.prepare(`UPDATE markers SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

  const updated = db
    .prepare(
      `SELECT m.*, u.username as author FROM markers m JOIN users u ON m.user_id = u.id WHERE m.id = ?`,
    )
    .get(id)

  return c.json(updated)
})

// DELETE
markers.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const db = getDb()

  const existing = db.prepare('SELECT user_id FROM markers WHERE id = ?').get(id) as
    | { user_id: number }
    | undefined
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (existing.user_id !== user.id && user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  db.prepare('DELETE FROM markers WHERE id = ?').run(id)
  return c.json({ ok: true })
})

export default markers
