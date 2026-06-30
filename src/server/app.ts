import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fsp from 'fs/promises';
import fs from 'fs';
import { env, PROJECT_ROOT } from './config/env';
import { logger } from './utils/logger';
import { adminAuth } from './middleware/auth';
import photoRoutes from './routes/photo';
import healthRoutes from './routes/health';
import adminRoutes from './routes/admin';
import logRoutes from './routes/log';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'font-src': ["'self'", "https:", "http:"],
      'frame-ancestors': ["'self'"],
      'img-src': ["'self'", "data:"],
      'object-src': ["'none'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'script-src-attr': ["'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(compression());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => req.path.startsWith('/admin') || env.NODE_ENV === 'development',
});
app.use('/api', apiLimiter);

app.use(express.json({ limit: env.MAX_BODY_SIZE }));
app.use(express.urlencoded({ extended: true, limit: env.MAX_BODY_SIZE }));

app.use('/api', photoRoutes);
app.use('/api', healthRoutes);
app.use('/api', logRoutes);

app.use('/api/admin', adminAuth, adminRoutes);

const PRINTS_DIR = path.join(PROJECT_ROOT, 'prints');
app.use('/prints', express.static(PRINTS_DIR));

const distPath = path.join(PROJECT_ROOT, 'dist');
app.use(express.static(distPath));

const publicPath = path.join(PROJECT_ROOT, 'public');
app.use(express.static(publicPath));

const adminHtmlPath = path.join(distPath, 'admin.html');

app.get('/view/:sessionId', async (_req, res) => {
  try {
    const htmlPath = path.join(PROJECT_ROOT, 'src', 'server', 'views', 'view.html');
    const html = await fsp.readFile(htmlPath, 'utf-8');
    res.type('html').send(html);
  } catch (error) {
    logger.error(error, 'Failed to read view.html');
    res.status(500).send('Internal Server Error');
  }
});

if (fs.existsSync(adminHtmlPath)) {
  app.get('/admin', (_req, res) => {
    res.sendFile(adminHtmlPath);
  });
  app.get('/admin/{*path}', (_req, res) => {
    res.sendFile(adminHtmlPath);
  });
}

app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

logger.info('Express app configured');

export { app };
