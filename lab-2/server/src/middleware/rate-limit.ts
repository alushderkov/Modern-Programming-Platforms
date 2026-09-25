import type { RequestHandler } from 'express';
import { HttpError } from '../errors';

const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(req: { ip?: string; socket?: { remoteAddress?: string } }): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  key?: (req: Parameters<RequestHandler>[0]) => string;
}): RequestHandler {
  return (req, _res, next) => {
    const identity = options.key ? options.key(req) : clientIp(req);
    const key = `${options.keyPrefix}:${identity}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      next(
        new HttpError(429, 'RATE_LIMITED', 'Слишком много запросов, повторите позже', undefined, {
          'Retry-After': String(retryAfter),
        }),
      );
      return;
    }
    next();
  };
}

export function resetRateLimits(): void {
  buckets.clear();
}
