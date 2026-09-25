import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.logLevel,
  base: { service: 'kadr-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'refreshToken',
      'accessToken',
      'token',
      'req.body.password',
      'req.body.refreshToken',
      'req.headers.authorization',
    ],
    censor: '[redacted]',
  },
});
