import fsp from 'fs/promises';
import path from 'path';
import { getDb } from '../db';
import { logger } from '../utils/logger';
import { printPhoto } from './printService';
import { PRINTS_DIR } from '../config/env';

export interface AdminStats {
  totalSessions: number;
  activeSessions: number;
  todaySessions: number;
  totalPhotos: number;
  storageBytes: number;
  printFiles: number;
  dbSizeBytes: number;
  uptime: number;
}

export interface PaginatedSessions {
  sessions: AdminSessionRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdminSessionRow {
  session_id: string;
  composed_url: string;
  gif_url: string;
  video_url: string;
  photos: string[];
  name: string | null;
  wa: string | null;
  email: string | null;
  template: string | null;
  filter_text: string | null;
  expires_at: string;
  created_at: string;
  expired: boolean;
}

const startTime = Date.now();

export async function getAdminStats(): Promise<AdminStats> {
  const db = getDb();

  const totalSessions = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }).c;
  const activeSessions = (db.prepare("SELECT COUNT(*) as c FROM sessions WHERE expires_at > datetime('now')").get() as { c: number }).c;
  const todaySessions = (db.prepare("SELECT COUNT(*) as c FROM sessions WHERE date(created_at) = date('now')").get() as { c: number }).c;
  const totalPhotos = (db.prepare('SELECT COUNT(*) as c FROM photos').get() as { c: number }).c;

  let storageBytes = 0;
  let printFiles = 0;
  try {
    const entries = await fsp.readdir(PRINTS_DIR).catch(() => [] as string[]);
    for (const entry of entries) {
      if (entry === '.gitkeep') continue;
      printFiles++;
      try {
        const stat = await fsp.stat(path.join(PRINTS_DIR, entry));
        storageBytes += stat.size;
      } catch {}
    }
  } catch {}

  let dbSizeBytes = 0;
  try {
    const sizeRow = db.prepare(
      "SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()"
    ).get() as { size: number } | undefined;
    dbSizeBytes = sizeRow?.size || 0;
  } catch {}

  return {
    totalSessions,
    activeSessions,
    todaySessions,
    totalPhotos,
    storageBytes,
    printFiles,
    dbSizeBytes,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
}

export function getSessions(page: number, limit: number, search?: string): PaginatedSessions {
  const db = getDb();
  const offset = (page - 1) * limit;

  let where = '';
  const params: any[] = [];
  if (search) {
    where = 'WHERE name LIKE ? OR wa LIKE ? OR email LIKE ? OR session_id LIKE ?';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM sessions ${where}`).get(...params) as { total: number };
  const total = countRow.total;
  const pages = Math.ceil(total / limit) || 1;

  const rows = db.prepare(
    `SELECT * FROM sessions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as any[];

  const sessions: AdminSessionRow[] = rows.map((row) => {
    let photoFiles: string[] = [];
    try { photoFiles = JSON.parse(row.photos_json); } catch {}
    const gifFile = photoFiles.length > 0 ? `gif_${row.session_id.slice(0, 8)}.gif` : '';

    return {
      session_id: row.session_id,
      composed_url: `/prints/${row.composed_file}`,
      gif_url: gifFile ? `/prints/${gifFile}` : '',
      video_url: row.video_file ? `/prints/${row.video_file}` : '',
      photos: photoFiles.map((f: string) => `/prints/${f}`),
      name: row.name,
      wa: row.wa,
      email: row.email,
      template: row.template,
      filter_text: row.filter_text,
      expires_at: row.expires_at,
      created_at: row.created_at,
      expired: new Date() > new Date(row.expires_at),
    };
  });

  return { sessions, total, page, limit, pages };
}

export function getAdminSessionDetail(sessionId: string): AdminSessionRow | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as any;
  if (!row) return null;

  let photoFiles: string[] = [];
  try { photoFiles = JSON.parse(row.photos_json); } catch {}
  const gifFile = photoFiles.length > 0 ? `gif_${row.session_id.slice(0, 8)}.gif` : '';

  return {
    session_id: row.session_id,
    composed_url: `/prints/${row.composed_file}`,
    gif_url: gifFile ? `/prints/${gifFile}` : '',
    video_url: row.video_file ? `/prints/${row.video_file}` : '',
    photos: photoFiles.map((f: string) => `/prints/${f}`),
    name: row.name,
    wa: row.wa,
    email: row.email,
    template: row.template,
    filter_text: row.filter_text,
    expires_at: row.expires_at,
    created_at: row.created_at,
    expired: new Date() > new Date(row.expires_at),
  };
}

export async function deleteAdminSession(sessionId: string): Promise<{ deleted: boolean; filesRemoved: number }> {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as any;
  if (!row) {
    return { deleted: false, filesRemoved: 0 };
  }

  let filesRemoved = 0;
  const removeFile = async (filename: string) => {
    try {
      const fp = path.join(PRINTS_DIR, filename);
      await fsp.unlink(fp);
      filesRemoved++;
    } catch {}
  };

  await removeFile(row.composed_file);

  try {
    const photoFiles: string[] = JSON.parse(row.photos_json);
    await Promise.all(photoFiles.map(removeFile));
  } catch {}

  const gifFile = `gif_${row.session_id.slice(0, 8)}.gif`;
  await removeFile(gifFile);

  if (row.video_file) {
    await removeFile(row.video_file);
  }

  db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId);

  logger.info({ sessionId, filesRemoved }, 'Admin deleted session');
  return { deleted: true, filesRemoved };
}

export async function reprintAdminSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as any;
  if (!row) {
    return { success: false, message: 'Session not found' };
  }

  const filepath = path.join(PRINTS_DIR, row.composed_file);
  try {
    await fsp.access(filepath);
  } catch {
    return { success: false, message: 'Composed photo file not found on disk' };
  }

  try {
    await printPhoto(filepath);
    logger.info({ sessionId }, 'Admin reprint success');
    return { success: true, message: 'Print job sent' };
  } catch (error) {
    logger.error({ error, sessionId }, 'Admin reprint failed');
    return { success: false, message: error instanceof Error ? error.message : 'Print failed' };
  }
}

export function exportSessionsToCSV(): string {
  const db = getDb();
  const rows = db.prepare('SELECT session_id, name, wa, email, template, filter_text, created_at FROM sessions ORDER BY created_at DESC').all() as {
    session_id: string;
    name: string | null;
    wa: string | null;
    email: string | null;
    template: string | null;
    filter_text: string | null;
    created_at: string;
  }[];

  let csv = 'Session ID,Name,WhatsApp,Email,Template,Filter,Created At\n';
  for (const row of rows) {
    const escapedName = (row.name || '').replace(/"/g, '""');
    const escapedWa = (row.wa || '').replace(/"/g, '""');
    const escapedEmail = (row.email || '').replace(/"/g, '""');
    csv += `"${row.session_id}","${escapedName}","${escapedWa}","${escapedEmail}","${row.template || ''}","${row.filter_text || ''}","${row.created_at}"\n`;
  }
  return csv;
}
