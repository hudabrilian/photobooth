import type { Request, Response } from 'express';
import path from 'path';
import { createSession, getSession, getPhotos } from '../services/photoService';
import { printPhoto } from '../services/printService';
import { savePhotoSchema } from '../validation/photoSchema';
import { logger } from '../utils/logger';
import { PRINTS_DIR } from '../config/env';

export async function handleSavePhoto(req: Request, res: Response): Promise<void> {
  try {
    const parsed = savePhotoSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { composedBase64, photos, userData, template, filter, videoBase64 } = parsed.data;

    const session = await createSession(
      composedBase64,
      photos,
      userData,
      template,
      filter,
      videoBase64
    );

    let printed = false;
    if (session.composed_file) {
      try {
        await printPhoto(path.join(PRINTS_DIR, session.composed_file));
        printed = true;
      } catch (printErr) {
        logger.warn(printErr, 'Print failed, session saved anyway');
      }
    }

    res.json({
      success: true,
      session_id: session.session_id,
      expires_at: session.expires_at,
      printed,
    });
  } catch (error) {
    logger.error(error, 'Failed to save photo');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export function handleGetSession(req: Request, res: Response): void {
  try {
    const sessionId = req.params.sessionId as string;

    if (!sessionId) {
      res.status(400).json({ success: false, message: 'No session ID provided' });
      return;
    }

    const session = getSession(sessionId);

    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (error) {
    logger.error(error, 'Failed to get session');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export function handleGetPhotos(_req: Request, res: Response): void {
  try {
    const photos = getPhotos();
    res.json({ success: true, data: photos });
  } catch (error) {
    logger.error(error, 'Failed to get photos');
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
