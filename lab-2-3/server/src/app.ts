import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { filmsRouter } from './routes/films';
import { authRouter, usersRouter } from './routes/auth';
import { errorHandler, notFound } from './middleware/error';
import { requestLogger } from './middleware/request-logger';

export function createApp(): express.Express {
  fs.mkdirSync(config.uploadDir, { recursive: true });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cors());
  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/films', filmsRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
