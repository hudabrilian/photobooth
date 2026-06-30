import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const { PORT } = env;

app.listen(PORT, () => {
  logger.info('SnapBooth backend started');
  logger.info(`http://localhost:${PORT}`);
});

import { runCleanup } from './services/cleanup';

runCleanup().catch((err) => logger.error(err, 'Initial cleanup failed'));

setInterval(() => {
  runCleanup().catch((err) => logger.error(err, 'Scheduled cleanup failed'));
}, 60 * 60 * 1000);

logger.info('Cleanup scheduler registered (every 1 hour)');
