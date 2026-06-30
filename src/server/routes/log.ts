import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

router.post('/logs', (req: Request, res: Response) => {
  const { level, message, error } = req.body;

  const logPayload = {
    client: true,
    message,
    error: error || undefined,
  };

  if (level === 'error') {
    logger.error(logPayload, 'Frontend Error Boundary Catch');
  } else if (level === 'warn') {
    logger.warn(logPayload, 'Frontend warning received');
  } else {
    logger.info(logPayload, 'Frontend log received');
  }

  res.status(200).json({ success: true });
});

export default router;
