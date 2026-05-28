import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { getDb } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const UPLOAD_DIR = join(import.meta.dirname, '../../data/uploads')
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
])
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

const uploads = new Hono()

// Upload file to a marker
uploads.post('/:markerId', requireAuth, async (c) => {
  const markerId = Number(c.req.param('markerId'))
  const db = getDb()

  const marker = db.prepare('SELECT id FROM markers WHERE id = ?').get(markerId)
  if (!marker) return c.json({ error: 'Marker not found' }, 404)

  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'ファイルが必要です' }, 400)
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: '対応形式: JPG, PNG, GIF, WebP, MP4, WebM' }, 400)
  }
  if (file.size > MAX_SIZE) {
    return c.json({ error: 'ファイルサイズは20MB以下にしてください' }, 400)
  }

  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

  const ext = extname(file.name) || '.bin'
  const filename = `${randomUUID()}${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  writeFileSync(join(UPLOAD_DIR, filename), buffer)

  const result = db
    .prepare('INSERT INTO attachments (marker_id, filename, original_name, mime_type) VALUES (?, ?, ?, ?)')
    .run(markerId, filename, file.name, file.type)

  return c.json({
    id: result.lastInsertRowid,
    marker_id: markerId,
    filename,
    original_name: file.name,
    mime_type: file.type,
    url: `/api/uploads/file/${filename}`,
  }, 201)
})

// Serve uploaded file
uploads.get('/file/:filename', async (c) => {
  const filename = c.req.param('filename')
  const filepath = join(UPLOAD_DIR, filename)

  if (!existsSync(filepath)) return c.json({ error: 'Not found' }, 404)

  const db = getDb()
  const att = db.prepare('SELECT mime_type FROM attachments WHERE filename = ?').get(filename) as
    | { mime_type: string } | undefined

  const data = readFileSync(filepath)
  c.header('Content-Type', att?.mime_type ?? 'application/octet-stream')
  c.header('Cache-Control', 'public, max-age=31536000')
  return c.body(data)
})

// List attachments for a marker
uploads.get('/:markerId', async (c) => {
  const markerId = Number(c.req.param('markerId'))
  const db = getDb()
  const rows = db.prepare('SELECT id, filename, original_name, mime_type, created_at FROM attachments WHERE marker_id = ? ORDER BY created_at ASC').all(markerId)
  const result = (rows as { id: number; filename: string; original_name: string; mime_type: string; created_at: string }[]).map((r) => ({
    ...r,
    url: `/api/uploads/file/${r.filename}`,
  }))
  return c.json(result)
})

// Delete attachment
uploads.delete('/attachment/:id', requireAuth, async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb()
  const att = db.prepare('SELECT filename FROM attachments WHERE id = ?').get(id) as
    | { filename: string } | undefined
  if (!att) return c.json({ error: 'Not found' }, 404)

  db.prepare('DELETE FROM attachments WHERE id = ?').run(id)
  // file cleanup is optional, left on disk for now
  return c.json({ ok: true })
})

export default uploads
