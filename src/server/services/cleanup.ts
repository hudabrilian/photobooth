import fsp from 'fs/promises';
import path from 'path';
import { getDb } from '../db';
import { logger } from '../utils/logger';
import { PRINTS_DIR } from '../config/env';
import { cleanupExpiredSessions } from './photoService';

function getReferencedFiles(): Set<string> {
  const files = new Set<string>();
  const db = getDb();

  const sessions = db.prepare(
    "SELECT composed_file, photos_json, session_id, video_file FROM sessions WHERE expires_at > datetime('now')"
  ).all() as { composed_file: string; photos_json: string; session_id: string; video_file: string | null }[];

  for (const row of sessions) {
    files.add(row.composed_file);
    const gifFile = `gif_${row.session_id.slice(0, 8)}.gif`;
    files.add(gifFile);
    if (row.video_file) {
      files.add(row.video_file);
    }
    try {
      const photoFiles: string[] = JSON.parse(row.photos_json);
      for (const f of photoFiles) files.add(f);
    } catch {}
  }

  const legacyPhotos = db.prepare('SELECT filename FROM photos').all() as { filename: string }[];
  for (const row of legacyPhotos) {
    files.add(row.filename);
  }

  return files;
}

export async function cleanupOrphanedFiles(): Promise<number> {
  const referenced = getReferencedFiles();
  let deleted = 0;

  try {
    let entries: string[];
    try {
      entries = await fsp.readdir(PRINTS_DIR);
    } catch {
      return 0;
    }

    for (const entry of entries) {
      if (entry === '.gitkeep') continue;
      if (referenced.has(entry)) continue;

      const filepath = path.join(PRINTS_DIR, entry);
      try {
        await fsp.unlink(filepath);
        deleted++;
        logger.debug({ file: entry }, 'Deleted orphaned file');
      } catch (err) {
        logger.error({ err, file: entry }, 'Failed to delete orphaned file');
      }
    }
  } catch (err) {
    logger.error(err, 'Failed to scan prints directory');
  }

  return deleted;
}

export async function runCleanup(): Promise<{ sessionsRemoved: number; filesRemoved: number }> {
  const sessionsRemoved = cleanupExpiredSessions();
  const filesRemoved = await cleanupOrphanedFiles();
  logger.info({ sessionsRemoved, filesRemoved }, 'Cleanup completed');
  return { sessionsRemoved, filesRemoved };
}
