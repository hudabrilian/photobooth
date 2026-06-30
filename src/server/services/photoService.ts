import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import GIFEncoder from 'gifencoder';
import * as jpeg from 'jpeg-js';
import { getDb } from '../db';
import { printPhoto } from './printService';
import { validateJpeg } from '../utils/image';
import { logger } from '../utils/logger';
import { PRINTS_DIR } from '../config/env';
import type { UserData, PhotoRecord, SessionRecord, SessionResponse } from '../types';

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('/usr/local/bin/ffmpeg', args, { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function convertWebMToMP4(webmPath: string, mp4Path: string): Promise<void> {
  try {
    await runFFmpeg([
      '-y', '-i', webmPath,
      '-filter:v', 'setpts=0.25*PTS',
      '-an', '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p', '-crf', '23',
      mp4Path,
    ]);
    logger.info({ webmPath, mp4Path }, 'Video converted to MP4 timelapse successfully');
  } catch (error) {
    logger.error(error, 'FFmpeg video conversion failed');
    throw error;
  }
}

async function ensurePrintsDir(): Promise<void> {
  try {
    await fsp.mkdir(PRINTS_DIR, { recursive: true });
  } catch {
    // already exists
  }
}
void ensurePrintsDir();

function sanitizeUserData(data: UserData): UserData {
  const stripHtml = (v?: string) => v?.replace(/<[^>]*>/g, '').trim() || undefined;
  return {
    name: stripHtml(data.name)?.slice(0, 100),
    wa: stripHtml(data.wa)?.replace(/[^0-9+]/g, '').slice(0, 20),
    email: stripHtml(data.email)?.slice(0, 255),
  };
}

async function saveBase64Image(base64Str: string, prefix: string): Promise<string> {
  const validation = validateJpeg(base64Str);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  const filename = `${prefix}_${timestamp}_${random}.jpg`;
  const filepath = path.join(PRINTS_DIR, filename);
  await fsp.writeFile(filepath, base64Data, 'base64');
  logger.debug({ filename }, 'Image saved');
  return filename;
}

async function generateGif(photoFiles: string[], sessionPrefix: string): Promise<string> {
  const frames: { data: Uint8Array; width: number; height: number }[] = [];

  for (const file of photoFiles) {
    const buf = await fsp.readFile(path.join(PRINTS_DIR, file));
    const decoded = jpeg.decode(buf, { formatAsRGBA: true });
    frames.push({ data: decoded.data, width: decoded.width, height: decoded.height });
  }

  if (frames.length === 0) {
    throw new Error('No photo frames to generate GIF');
  }

  const width = Math.max(...frames.map((f) => f.width));
  const height = Math.max(...frames.map((f) => f.height));

  const encoder = new GIFEncoder(width, height);
  const filename = `gif_${sessionPrefix}.gif`;
  const filepath = path.join(PRINTS_DIR, filename);

  encoder.start();
  encoder.setRepeat(0);
  encoder.setQuality(15);

  for (const frame of frames) {
    encoder.setDelay(2500);

    if (frame.width === width && frame.height === height) {
      encoder.addFrame(frame.data);
    } else {
      const padded = Buffer.alloc(width * height * 4, 255);
      const ox = Math.floor((width - frame.width) / 2);
      const oy = Math.floor((height - frame.height) / 2);
      for (let y = 0; y < frame.height; y++) {
        const srcStart = y * frame.width * 4;
        const dstStart = ((oy + y) * width + ox) * 4;
        padded.set(frame.data.subarray(srcStart, srcStart + frame.width * 4), dstStart);
      }
      encoder.addFrame(padded);
    }
  }

  const readStream = encoder.createReadStream();
  encoder.finish();

  return new Promise<string>((resolve, reject) => {
    const writeStream = fs.createWriteStream(filepath);
    readStream.pipe(writeStream);
    writeStream.on('finish', () => resolve(filename));
    writeStream.on('error', reject);
  });
}

export async function createSession(
  composedBase64: string,
  photos: string[],
  userData: UserData,
  template: string,
  filter: string,
  videoBase64?: string
): Promise<{ session_id: string; composed_file: string; gif_file: string; video_file: string; expires_at: string }> {
  const sanitized = sanitizeUserData(userData);
  const session_id = crypto.randomUUID();
  const prefix = session_id.slice(0, 8);
  const composed_file = await saveBase64Image(composedBase64, `composed_${prefix}`);
  const photoFiles = await Promise.all(
    photos.map((p, i) => saveBase64Image(p, `photo_${prefix}_${i + 1}`))
  );

  let gif_file = '';
  try {
    gif_file = await generateGif(photoFiles, prefix);
  } catch (err) {
    logger.error(err, 'GIF generation failed');
  }

  let video_file = '';
  if (videoBase64) {
    try {
      const webmFilename = `video_${prefix}_raw.webm`;
      const webmPath = path.join(PRINTS_DIR, webmFilename);
      await fsp.writeFile(webmPath, videoBase64, 'base64');

      const mp4Filename = `video_${prefix}.mp4`;
      const mp4Path = path.join(PRINTS_DIR, mp4Filename);

      await convertWebMToMP4(webmPath, mp4Path);
      video_file = mp4Filename;

      try {
        await fsp.unlink(webmPath);
      } catch {}
    } catch (err) {
      logger.error(err, 'Video processing failed');
    }
  }

  const expires_at = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO sessions (session_id, composed_file, photos_json, name, wa, email, template, filter_text, video_file, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    session_id,
    composed_file,
    JSON.stringify(photoFiles),
    sanitized.name || null,
    sanitized.wa || null,
    sanitized.email || null,
    template || null,
    filter || null,
    video_file || null,
    expires_at
  );

  logger.info({ session_id, user: sanitized.name || 'Anonymous' }, 'Session created');

  return { session_id, composed_file, gif_file, video_file, expires_at };
}

export function getSession(sessionId: string): SessionResponse | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as
    | SessionRecord
    | undefined;
  if (!row) return null;

  const now = new Date();
  const expiresAt = new Date(row.expires_at);
  const expired = now > expiresAt;

  const photoFiles: string[] = JSON.parse(row.photos_json);
  const gifFile = photoFiles.length > 0
    ? `gif_${row.session_id.slice(0, 8)}.gif`
    : '';

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
    filter: row.filter_text,
    expires_at: row.expires_at,
    created_at: row.created_at,
    expired,
  };
}

export function cleanupExpiredSessions(): number {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM sessions WHERE expires_at < datetime('now')")
    .run();
  if (result.changes > 0) {
    logger.info({ removed: result.changes }, 'Expired sessions cleaned up');
  }
  return result.changes;
}

export async function savePhoto(
  imageBase64: string,
  userData: UserData
): Promise<{ filename: string; filepath: string }> {
  const sanitized = sanitizeUserData(userData);
  const filename = await saveBase64Image(imageBase64, 'legacy');
  const filepath = path.join(PRINTS_DIR, filename);
  logger.info({ filename, user: sanitized.name || 'Anonymous' }, 'Photo saved');

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO photos (filename, name, wa, email)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(filename, sanitized.name || null, sanitized.wa || null, sanitized.email || null);

  return { filename, filepath };
}

export async function saveAndPrint(
  imageBase64: string,
  userData: UserData
): Promise<{ filename: string; printed: boolean }> {
  const { filename } = await savePhoto(imageBase64, userData);

  try {
    await printPhoto(path.join(PRINTS_DIR, filename));
    return { filename, printed: true };
  } catch (error) {
    logger.error(error, 'Print failed');
    return { filename, printed: false };
  }
}

export function getPhotos(): PhotoRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM photos ORDER BY created_at DESC').all() as PhotoRecord[];
}
