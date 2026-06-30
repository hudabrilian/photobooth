import Database from 'better-sqlite3';
import path from 'path';
import { DATA_DIR } from '../config/env';
import { logger } from '../utils/logger';

const DB_PATH = path.join(DATA_DIR, 'snapbooth.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate();
  }
  return db;
}

function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      name TEXT,
      wa TEXT,
      email TEXT,
      template TEXT,
      filter TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      composed_file TEXT NOT NULL,
      photos_json TEXT NOT NULL,
      name TEXT,
      wa TEXT,
      email TEXT,
      template TEXT,
      filter_text TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)
  `);

  try {
    db.prepare('ALTER TABLE sessions ADD COLUMN video_file TEXT').run();
  } catch {
    // Column already exists
  }

  logger.info('Database migrated');
}

export function closeDb(): void {
  if (db) {
    db.close();
    logger.info('Database connection closed');
  }
}
