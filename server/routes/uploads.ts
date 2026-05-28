import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import { getDb } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const UPLOAD_DIR = join(import.meta.dirname, '../../data/uploads')
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'])
const SAFE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm'])
const MAX_SIZE = 20 * 1024 * 1024
const MAX_ATTACHMENTS = 10

const uploads = new Hono()

// Upload file to a marker
uploads.post('/:markerId', requireAuth, async (c) => {
  const markerId = Number(c.req.param('markerId'))
  if (!Number.isInteger(markerId) || markerId <= 0) return c.json({ error: '無効なIDです' }, 400)

  const user = c.get('user')!
  const db = getDb()

  const marker = db.prepare('SELECT id, user_id FROM markers WHERE id = ?').get(markerId) as { id: number; user_id: number } | undefined
  if (!marker) return c.json({ error: 'Marker not found' }, 404)
  if (marker.user_id !== user.id && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  const count = db.prepare('SELECT COUNT(*) as cnt FROM attachments WHERE marker_id = ?').get(markerId) as { cnt: number }
  if (count.cnt >= MAX_ATTACHMENTS) return c.json({ error: `添付ファイルは${MAX_ATTACHMENTS}個までです` }, 400)

  const body = await c.req.parseBody()
  const file = body['file']
  if (!file || !(file instanceof File)) return c.json({ error: 'ファイルが必要です' }, 400)
  if (!ALLOWED_TYPES.has(file.type)) return c.json({ error: '対応形式: JPG, PNG, GIF, WebP, MP4, WebM' }, 400)
  if (file.size > MAX_SIZE) return c.json({ error: 'ファイルサイズは20MB以下にしてください' }, 400)

  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

  const rawExt = (file.name.split('.').pop() ?? '').toLowerCase()
  const ext = SAFE_EXT.has(rawExt) ? rawExt : 'bin'
  const filename = `${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  writeFileSync(join(UPLOAD_DIR, filename), buffer)

  const result = db.prepare('INSERT INTO attachments (marker_id, filename, original_name, mime_type) VALUES (?, ?, ?, ?)').run(markerId, filename, file.name, file.type)
  return c.json({ id: result.lastInsertRowid, marker_id: markerId, filename, original_name: file.name, mime_type: file.type, url: `/api/uploads/file/${filename}` }, 201)
})

// Serve uploaded file — validate filename strictly
uploads.get('/file/:filename', async (c) => {
  const filename = c.req.param('filename')
  if (!/^[0-9a-f-]+\.(jpg|jpeg|png|gif|webp|mp4|webm|bin)$/.test(filename)) {
    return c.json({ error: 'Invalid filename' }, 400)
  }

  const filepath = join(UPLOAD_DIR, basename(filename))
  if (!existsSync(filepath)) return c.json({ error: 'Not found' }, 404)

  const db = getDb()
  const att = db.prepare('SELECT mime_type FROM attachments WHERE filename = ?').get(filename) as { mime_type: string } | undefined
  if (!att) return c.json({ error: 'Not found' }, 404)

  const data = readFileSync(filepath)
  c.header('Content-Type', att.mime_type)
  c.header('Cache-Control', 'public, max-age=31536000')
  c.header('X-Content-Type-Options', 'nosniff')
  return c.body(data)
})

// List attachments (require auth + ownership check)
uploads.get('/:markerId', requireAuth, async (c) => {
  const markerId = Number(c.req.param('markerId'))
  if (!Number.isInteger(markerId) || markerId <= 0) return c.json({ error: '無効なIDです' }, 400)

  const user = c.get('user')!
  const db = getDb()

  const marker = db.prepare('SELECT id, user_id, is_shared FROM markers WHERE id = ?').get(markerId) as { id: number; user_id: number; is_shared: number } | undefined
  if (!marker) return c.json({ error: 'Not found' }, 404)
  if (!marker.is_shared && marker.user_id !== user.id && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  const rows = db.prepare('SELECT id, filename, original_name, mime_type, created_at FROM attachments WHERE marker_id = ? ORDER BY created_at ASC').all(markerId)
  const result = (rows as { id: number; filename: string; original_name: string; mime_type: string; created_at: string }[]).map((r) => ({
    ...r, url: `/api/uploads/file/${r.filename}`,
  }))
  return c.json(result)
})

// Delete attachment (require ownership)
uploads.delete('/attachment/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: '無効なIDです' }, 400)

  const user = c.get('user')!
  const db = getDb()

  const att = db.prepare('SELECT a.filename, m.user_id FROM attachments a JOIN markers m ON a.marker_id = m.id WHERE a.id = ?').get(id) as { filename: string; user_id: number } | undefined
  if (!att) return c.json({ error: 'Not found' }, 404)
  if (att.user_id !== user.id && user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
  return c.json({ ok: true })
})

export default uploads
