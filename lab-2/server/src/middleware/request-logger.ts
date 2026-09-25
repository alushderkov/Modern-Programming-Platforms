import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../logger';

export const requestLogger: RequestHandler = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  const started = Date.now();

  res.on('finish', () => {
    logger.info({
      event: 'http.request',
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - started,
      ip: req.ip,
      userId: req.auth?.id,
      role: req.auth?.role,
    });
  });

  next();
};
