import type { ErrorRequestHandler, RequestHandler } from 'express';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Тело запроса не является корректным JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};
