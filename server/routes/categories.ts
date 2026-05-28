import { Hono } from 'hono'
import { getDb } from '../db/index.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const categories = new Hono()

// GET: all categories (public)
categories.get('/', async (c) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all()
  return c.json(rows)
})

// POST: create category (admin)
categories.post('/', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<{
    key: string
    label: string
    color: string
    icon: string
    sort_order?: number
  }>()
  const db = getDb()

  const exists = db.prepare('SELECT id FROM categories WHERE key = ?').get(body.key)
  if (exists) return c.json({ error: 'このキーは既に使われています' }, 409)

  const maxSort = db.prepare('SELECT MAX(sort_order) as max FROM categories').get() as { max: number | null }
  const sortOrder = body.sort_order ?? (maxSort.max ?? 0) + 1

  const result = db
    .prepare('INSERT INTO categories (key, label, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(body.key, body.label, body.color, body.icon, sortOrder)

  return c.json({ id: result.lastInsertRowid, ...body, sort_order: sortOrder }, 201)
})

// PUT: update category (admin)
categories.put('/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    label?: string
    color?: string
    icon?: string
    sort_order?: number
  }>()
  const db = getDb()

  const sets: string[] = []
  const vals: unknown[] = []

  if (body.label !== undefined) { sets.push('label = ?'); vals.push(body.label) }
  if (body.color !== undefined) { sets.push('color = ?'); vals.push(body.color) }
  if (body.icon !== undefined) { sets.push('icon = ?'); vals.push(body.icon) }
  if (body.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(body.sort_order) }

  if (sets.length === 0) return c.json({ error: 'No fields' }, 400)

  vals.push(id)
  db.prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  return c.json(updated)
})

// DELETE: (admin)
categories.delete('/:id', requireAuth, requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb()
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  return c.json({ ok: true })
})

export default categories
