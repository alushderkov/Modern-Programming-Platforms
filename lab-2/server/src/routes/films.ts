import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { Film } from '../models/Film';
import { toFilmDto } from '../mapper';
import { filmBodySchema, listQuerySchema, requireId, validateBody, validateQuery } from '../validation';
import { multerMessage, posterUpload } from '../upload';
import { config } from '../config';
import type { FilmBody } from '../validation';
import type { FilmStatus } from '../types';

export const filmsRouter = Router();

filmsRouter.get('/', validateQuery(listQuerySchema), async (_req, res, next) => {
  try {
    const query = res.locals.query as { status?: FilmStatus };
    const filter = query.status ? { status: query.status } : {};
    const docs = await Film.find(filter).sort({ updatedAt: -1 });
    res.status(200).json(docs.map((doc) => toFilmDto(doc)));
  } catch (error) {
    next(error);
  }
});

filmsRouter.post('/', validateBody(filmBodySchema), async (req, res, next) => {
  try {
    const body = req.body as FilmBody;
    const doc = await Film.create(body);
    res.status(201).json(toFilmDto(doc));
  } catch (error) {
    next(error);
  }
});

filmsRouter.get('/:id', requireId(), async (req, res, next) => {
  try {
    const doc = await Film.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }
    res.status(200).json(toFilmDto(doc));
  } catch (error) {
    next(error);
  }
});

filmsRouter.put('/:id', requireId(), validateBody(filmBodySchema), async (req, res, next) => {
  try {
    const body = req.body as FilmBody;
    const doc = await Film.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!doc) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }
    res.status(200).json(toFilmDto(doc));
  } catch (error) {
    next(error);
  }
});

filmsRouter.delete('/:id', requireId(), async (req, res, next) => {
  try {
    const doc = await Film.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }
    if (doc.poster?.storedName) {
      fs.rmSync(path.join(config.uploadDir, doc.poster.storedName), { force: true });
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

filmsRouter.get('/:id/poster', requireId(), async (req, res, next) => {
  try {
    const doc = await Film.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }
    if (!doc.poster?.storedName) {
      return res.status(404).json({ error: 'Постер не загружен' });
    }
    const filePath = path.join(config.uploadDir, doc.poster.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл постера отсутствует на диске' });
    }
    res.setHeader('Content-Type', doc.poster.mimeType);
    res.status(200).sendFile(path.resolve(filePath));
  } catch (error) {
    next(error);
  }
});

filmsRouter.post('/:id/poster', requireId(), (req, res, next) => {
  posterUpload.single('poster')(req, res, (err: unknown) => {
    if (err) {
      return res.status(400).json({ error: multerMessage(err) });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Выберите файл в поле poster' });
    }
    const doc = await Film.findById(req.params.id);
    if (!doc) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(404).json({ error: 'Фильм не найден' });
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
  } catch (error) {
    next(error);
  }
});

filmsRouter.delete('/:id/poster', requireId(), async (req, res, next) => {
  try {
    const doc = await Film.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Фильм не найден' });
    }
    if (!doc.poster?.storedName) {
      return res.status(404).json({ error: 'Постер не загружен' });
    }
    fs.rmSync(path.join(config.uploadDir, doc.poster.storedName), { force: true });
    doc.set('poster', null);
    await doc.save();
    res.status(200).json(toFilmDto(doc));
  } catch (error) {
    next(error);
  }
});
