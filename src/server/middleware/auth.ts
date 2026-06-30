import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  if (!env.ADMIN_PASSWORD) {
    res.status(503).json({ success: false, message: 'Admin interface not configured (ADMIN_PASSWORD not set)' });
    return;
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey && apiKey === env.API_KEY && env.API_KEY) {
    next();
    return;
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="SnapBooth Admin"');
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
  const colon = decoded.indexOf(':');
  if (colon === -1) {
    res.status(401).json({ success: false, message: 'Invalid authorization format' });
    return;
  }

  const user = decoded.slice(0, colon);
  const pass = decoded.slice(colon + 1);

  if (user !== env.ADMIN_USER || pass !== env.ADMIN_PASSWORD) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  next();
}
