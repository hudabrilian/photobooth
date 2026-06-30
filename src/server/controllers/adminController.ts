import type { Request, Response } from 'express';
import {
  getAdminStats,
  getSessions,
  getAdminSessionDetail,
  deleteAdminSession,
  reprintAdminSession,
  exportSessionsToCSV,
} from '../services/adminService';
import { logger } from '../utils/logger';
import { runCleanup } from '../services/cleanup';

export async function handleGetStats(_req: Request, res: Response): Promise<void> {
  try {
    const stats = await getAdminStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error(error, 'Admin getStats failed');
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
}

export function handleListSessions(req: Request, res: Response): void {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) || undefined;

    const result = getSessions(page, limit, search);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(error, 'Admin listSessions failed');
    res.status(500).json({ success: false, message: 'Failed to list sessions' });
  }
}

export function handleGetSessionDetail(req: Request, res: Response): void {
  try {
    const sessionId = req.params.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'No session ID provided' });
      return;
    }

    const session = getAdminSessionDetail(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    logger.error(error, 'Admin getSessionDetail failed');
    res.status(500).json({ success: false, message: 'Failed to get session detail' });
  }
}

export async function handleDeleteSession(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.params.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'No session ID provided' });
      return;
    }

    const result = await deleteAdminSession(sessionId);
    if (!result.deleted) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(error, 'Admin deleteSession failed');
    res.status(500).json({ success: false, message: 'Failed to delete session' });
  }
}

export async function handleReprintSession(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.params.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'No session ID provided' });
      return;
    }

    const result = await reprintAdminSession(sessionId);
    res.json({ success: result.success, message: result.message });
  } catch (error) {
    logger.error(error, 'Admin reprintSession failed');
    res.status(500).json({ success: false, message: 'Failed to reprint session' });
  }
}

export function handleEvents(req: Request, res: Response): void {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  const sendStats = async () => {
    try {
      const stats = await getAdminStats();
      res.write(`event: stats\ndata: ${JSON.stringify(stats)}\n\n`);
    } catch (error) {
      logger.error(error, 'SSE stats failed');
    }
  };

  const sendRecentSessions = () => {
    try {
      const result = getSessions(1, 5);
      res.write(`event: sessions\ndata: ${JSON.stringify(result.sessions)}\n\n`);
    } catch (error) {
      logger.error(error, 'SSE sessions failed');
    }
  };

  sendStats();
  sendRecentSessions();

  const statsTimer = setInterval(sendStats, 3000);
  const sessionsTimer = setInterval(sendRecentSessions, 10000);

  req.on('close', () => {
    clearInterval(statsTimer);
    clearInterval(sessionsTimer);
  });
}

export function handleExportCSV(_req: Request, res: Response): void {
  try {
    const csv = exportSessionsToCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sessions.csv');
    res.status(200).send(csv);
  } catch (error) {
    logger.error(error, 'Admin exportCSV failed');
    res.status(500).json({ success: false, message: 'Failed to export CSV' });
  }
}

export async function handleManualCleanup(_req: Request, res: Response): Promise<void> {
  try {
    const result = await runCleanup();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(error, 'Admin manual cleanup failed');
    res.status(500).json({ success: false, message: 'Failed to run cleanup' });
  }
}
