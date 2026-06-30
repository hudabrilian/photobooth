import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MAX_BODY_SIZE: z.string().default('100mb'),
  API_KEY: z.string().default(''),
  ADMIN_USER: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default(''),
  LOG_LEVEL: z.string().default('debug'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const PROJECT_ROOT = process.cwd();
export const PRINTS_DIR = path.join(PROJECT_ROOT, 'prints');
export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
