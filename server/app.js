import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    }),
  );

  // Raw body needed for Paystack webhook signature verification.
  // Keep before json() and scope to the webhook path only.
  app.use('/api/v1/membership/paystack-webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(mongoSanitize());
  app.use(hpp());

  if (!env.isTest) {
    app.use(
      morgan(env.isProd ? 'combined' : 'dev', {
        stream: { write: (msg) => logger.http?.(msg.trim()) ?? logger.info(msg.trim()) },
      }),
    );
  }

  app.get('/health', (req, res) => res.json({ status: 'ok', env: env.nodeEnv }));

  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
