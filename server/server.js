import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { ensureDefaults } from './services/siteSettings.service.js';
import { startCronJobs } from './jobs/membershipCron.js';

async function bootstrap() {
  await connectDB();
  await ensureDefaults();
  startCronJobs();
  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(
        `Port ${env.port} is already in use. Stop the process using it or change PORT in server/.env.`,
      );
    } else {
      logger.error(err);
    }
    process.exit(1);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled rejection', err);
  });
}

bootstrap().catch((err) => {
  logger.error(err);
  process.exit(1);
});
