import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { Film } from '../models/Film';
import { toFilmDto } from '../mapper';
import { filmBodySchema, listQuerySchema, requireId, validateBody, validateQuery } from '../validation';
import { multerMessage, posterUpload } from '../upload';
import { config } from '../config';
import { asyncHandler } from '../async-handler';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../errors';
import type { FilmBody } from '../validation';
import type { FilmStatus } from '../types';

export const filmsRouter = Router();

filmsRouter.get(
  '/',
  requireAuth('viewer'),
  validateQuery(listQuerySchema),
  asyncHandler(async (_req, res) => {
    const query = res.locals.query as { status?: FilmStatus };
    const filter = query.status ? { status: query.status } : {};
    const docs = await Film.find(filter).sort({ updatedAt: -1 });
    res.status(200).json(docs.map((doc) => toFilmDto(doc)));
  }),
);

filmsRouter.post(
  '/',
  requireAuth('editor'),
  validateBody(filmBodySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as FilmBody;
    const doc = await Film.create(body);
    res.status(201).json(toFilmDto(doc));
  }),
);

filmsRouter.get(
  '/:id',
  requireAuth('viewer'),
  requireId(),
  asyncHandler(async (req, res) => {
    const doc = await Film.findById(req.params.id);
    if (!doc) {
      throw new HttpError(404, 'FILM_NOT_FOUND', 'Фильм не найден');
    }
    res.status(200).json(toFilmDto(doc));
  }),
);

filmsRouter.put(
  '/:id',
  requireAuth('editor'),
  requireId(),
  validateBody(filmBodySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as FilmBody;
    const doc = await Film.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!doc) {
      throw new HttpError(404, 'FILM_NOT_FOUND', 'Фильм не найден');
    }
    res.status(200).json(toFilmDto(doc));
  }),
);

filmsRouter.delete(
  '/:id',
  requireAuth('admin'),
  requireId(),
  asyncHandler(async (req, res) => {
    const doc = await Film.findByIdAndDelete(req.params.id);
    if (!doc) {
      throw new HttpError(404, 'FILM_NOT_FOUND', 'Фильм не найден');
    }
    if (doc.poster?.storedName) {
      fs.rmSync(path.join(config.uploadDir, doc.poster.storedName), { force: true });
    }
    res.status(204).end();
  }),
);

filmsRouter.get(
  '/:id/poster',
  requireAuth('viewer'),
  requireId(),
  asyncHandler(async (req, res) => {
    const doc = await Film.findById(req.params.id);
    if (!doc) {
      throw new HttpError(404, 'FILM_NOT_FOUND', 'Фильм не найден');
    }
    if (!doc.poster?.storedName) {
      throw new HttpError(404, 'POSTER_NOT_FOUND', 'Постер не загружен');
    }
    const filePath = path.join(config.uploadDir, doc.poster.storedName);
    if (!fs.existsSync(filePath)) {
      throw new HttpError(404, 'POSTER_MISSING', 'Файл постера отсутствует на диске');
    }
    res.setHeader('Content-Type', doc.poster.mimeType);
    res.status(200).sendFile(path.resolve(filePath));
  }),
);

filmsRouter.post(
  '/:id/poster',
  requireAuth('editor'),
  requireId(),
  (req, res, next) => {
    posterUpload.single('poster')(req, res, (err: unknown) => {
      if (err) {
        next(multerToHttp(err));
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new HttpError(400, 'POSTER_REQUIRED', 'Выберите файл в поле poster');
    }
    const doc = await Film.findById(req.params.id);
    if (!doc) {
      fs.rmSync(req.file.path, { force: true });
      throw new HttpError(404, 'FILM_NOT_FOUND', 'Фильм не найден');
    }
    if (doc.poster?.storedName) {
      fs.rmSync(path.join(config.uploadDir, doc.poster.storedName), { force: true });
    }
    doc.poster = {
      storedName: req.file.filename,
      originalName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
      mimeType: req.file.mimetype,
      size: req.file.size,
    };
    await doc.save();
    res.status(200).json(toFilmDto(doc));
  }),
);

filmsRouter.delete(
  '/:id/poster',
  requireAuth('editor'),
  requireId(),
  asyncHandler(async (req, res) => {
    const doc = await Film.findById(req.params.id);
    if (!doc) {
      throw new HttpError(404, 'FILM_NOT_FOUND', 'Фильм не найден');
    }
    if (!doc.poster?.storedName) {
      throw new HttpError(404, 'POSTER_NOT_FOUND', 'Постер не загружен');
    }
    fs.rmSync(path.join(config.uploadDir, doc.poster.storedName), { force: true });
    doc.set('poster', null);
    await doc.save();
    res.status(200).json(toFilmDto(doc));
  }),
);

function multerToHttp(err: unknown): HttpError {
  const message = multerMessage(err);
  if (message === 'Файл больше 5 МБ') {
    return new HttpError(413, 'PAYLOAD_TOO_LARGE', message);
  }
  if (message.includes('изображением')) {
    return new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', message);
  }
  return new HttpError(400, 'UPLOAD_ERROR', message);
}
