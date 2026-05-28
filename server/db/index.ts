import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'
import { hashSync } from 'bcryptjs'

const DB_PATH = join(import.meta.dirname, '../../data/fivem_map.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (db) return db
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const schema = readFileSync(join(import.meta.dirname, 'schema.sql'), 'utf-8')
  db.exec(schema)

  migrate(db)
  seedDefaults(db)
  return db
}

function migrate(db: Database.Database) {
  // Add status column if missing (migration for existing DBs)
  const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[]
  const hasStatus = cols.some((c) => c.name === 'status')
  if (!hasStatus) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'")
  }
}

function seedDefaults(db: Database.Database) {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
  if (!adminExists) {
    db.prepare('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)').run(
      'admin',
      hashSync('admin', 10),
      'admin',
      'approved',
    )
  }

  const catCount = db.prepare('SELECT COUNT(*) as cnt FROM categories').get() as { cnt: number }
  if (catCount.cnt === 0) {
    const cats = [
      { key: 'police', label: '警察署', color: '#3b82f6', icon: '🚔', sort: 0 },
      { key: 'hospital', label: '病院', color: '#ef4444', icon: '🏥', sort: 1 },
      { key: 'gas_station', label: 'ガソリンスタンド', color: '#f59e0b', icon: '⛽', sort: 2 },
      { key: 'shop', label: 'ショップ', color: '#10b981', icon: '🏪', sort: 3 },
      { key: 'garage', label: 'ガレージ', color: '#8b5cf6', icon: '🔧', sort: 4 },
      { key: 'landmark', label: 'ランドマーク', color: '#ec4899', icon: '📍', sort: 5 },
      { key: 'custom', label: 'カスタム', color: '#6b7280', icon: '📌', sort: 6 },
    ]
    const stmt = db.prepare(
      'INSERT INTO categories (key, label, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
    )
    for (const c of cats) {
      stmt.run(c.key, c.label, c.color, c.icon, c.sort)
    }
  }
}
