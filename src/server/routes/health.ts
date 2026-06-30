import { Router } from 'express';
import { getDb } from '../db';
import fsp from 'fs/promises';
import { PRINTS_DIR } from '../config/env';

const router = Router();
const startTime = Date.now();

router.get('/health', async (_req, res) => {
  let dbOk = false;
  let dbSize = 0;
  try {
    const row = getDb().prepare('SELECT 1 AS ok').get() as { ok: number } | undefined;
    dbOk = row?.ok === 1;
    const sizeRow = getDb().prepare('SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()').get() as { size: number } | undefined;
    dbSize = sizeRow?.size || 0;
  } catch {}

  let printCount = 0;
  try {
    const entries = await fsp.readdir(PRINTS_DIR).catch(() => [] as string[]);
    printCount = entries.filter((f) => f !== '.gitkeep').length;
  } catch {}

  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      database: dbOk ? 'connected' : 'error',
      dbSizeBytes: dbSize,
      printFiles: printCount,
      memory: process.memoryUsage(),
      node: process.version,
      env: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;
