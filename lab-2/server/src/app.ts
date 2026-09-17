import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { filmsRouter } from './routes/films';
import { errorHandler, notFound } from './middleware/error';

export function createApp(): express.Express {
  fs.mkdirSync(config.uploadDir, { recursive: true });

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use('/api/films', filmsRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
