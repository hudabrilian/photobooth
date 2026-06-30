import { Router } from 'express';
import {
  handleGetStats,
  handleListSessions,
  handleGetSessionDetail,
  handleDeleteSession,
  handleReprintSession,
  handleEvents,
  handleExportCSV,
  handleManualCleanup,
} from '../controllers/adminController';

const router = Router();

router.get('/stats', handleGetStats);
router.get('/sessions', handleListSessions);
router.get('/export', handleExportCSV);
router.post('/cleanup', handleManualCleanup);
router.get('/sessions/:sessionId', handleGetSessionDetail);
router.delete('/sessions/:sessionId', handleDeleteSession);
router.post('/reprint/:sessionId', handleReprintSession);
router.get('/events', handleEvents);

export default router;
