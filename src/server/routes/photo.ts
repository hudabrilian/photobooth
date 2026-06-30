import { Router } from 'express';
import {
  handleSavePhoto,
  handleGetSession,
  handleGetPhotos,
} from '../controllers/photoController';

const router = Router();

router.post('/save-photo', handleSavePhoto);
router.get('/photos', handleGetPhotos);
router.get('/sessions/:sessionId', handleGetSession);

export default router;
