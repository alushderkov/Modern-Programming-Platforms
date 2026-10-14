import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { HttpError, httpErrorBody } from '../errors';
import { logger } from '../logger';

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', `Маршрут ${req.method} ${req.path} не найден`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.id;

  if (err instanceof HttpError) {
    if (err.headers) {
      for (const [name, value] of Object.entries(err.headers)) {
        res.setHeader(name, value);
      }
    }
    const level = err.status >= 500 ? 'error' : 'warn';
    logger[level]({
      event: 'http.error',
      requestId,
      status: err.status,
      code: err.code,
      message: err.message,
      method: req.method,
      path: req.originalUrl,
      userId: req.auth?.id,
    });
    return res.status(err.status).json(httpErrorBody(err, requestId));
  }

  if (err instanceof SyntaxError && 'body' in err) {
    const error = new HttpError(400, 'INVALID_JSON', 'Тело запроса не является корректным JSON');
    logger.warn({ event: 'http.error', requestId, code: error.code, path: req.originalUrl });
    return res.status(400).json(httpErrorBody(error, requestId));
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const error = new HttpError(
      400,
      'VALIDATION_ERROR',
      'Некорректные данные',
      Object.entries(err.errors).map(([field, item]) => ({ field, message: item.message })),
    );
    return res.status(400).json(httpErrorBody(error, requestId));
  }

  if (err instanceof mongoose.Error.CastError) {
    const error = new HttpError(400, 'INVALID_ID', 'Некорректный идентификатор');
    return res.status(400).json(httpErrorBody(error, requestId));
  }

  if (typeof err === 'object' && err && 'code' in err && (err as { code?: number }).code === 11000) {
    const error = new HttpError(409, 'CONFLICT', 'Ресурс с такими данными уже существует');
    return res.status(409).json(httpErrorBody(error, requestId));
  }

  logger.error({
    event: 'http.error',
    requestId,
    err,
    method: req.method,
    path: req.originalUrl,
  });
  const error = new HttpError(500, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера');
  res.status(500).json(httpErrorBody(error, requestId));
};

export function methodNotAllowed(allowed: string[]): RequestHandler {
  return (_req, res) => {
    res.setHeader('Allow', allowed.join(', '));
    const error = new HttpError(405, 'METHOD_NOT_ALLOWED', `Метод не допускается. Разрешено: ${allowed.join(', ')}`);
    res.status(405).json(httpErrorBody(error));
  };
}
