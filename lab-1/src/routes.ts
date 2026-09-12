import path from 'node:path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { MulterError } from 'multer';
import type { TaskStore } from './store';
import { UPLOADS_DIR } from './store';
import { upload } from './upload';
import { isTaskStatus } from './types';
import { parseTaskInput } from './helpers';

function uploadErrorMessage(err: unknown): string {
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return 'Файл больше 10 МБ.';
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Не удалось загрузить файл.';
}

export function createTaskRouter(store: TaskStore): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const statusQuery = typeof req.query.status === 'string' ? req.query.status : 'all';
    const status = statusQuery === 'all' || isTaskStatus(statusQuery) ? statusQuery : 'all';
    const notice = typeof req.query.notice === 'string' ? req.query.notice : null;
    const error = typeof req.query.error === 'string' ? req.query.error : null;

    res.render('index', {
      title: 'Задачи',
      tasks: store.list(status),
      currentStatus: status,
      notice,
      error,
    });
  });

  router.get('/tasks/new', (req, res) => {
    res.render('new', {
      title: 'Новая задача',
      error: typeof req.query.error === 'string' ? req.query.error : null,
      values: {
        title: '',
        description: '',
        status: 'pending',
        dueDate: '',
      },
    });
  });

  router.post('/tasks', (req, res) => {
    const parsed = parseTaskInput(req.body);
    if ('error' in parsed) {
      return res.status(400).render('new', {
        title: 'Новая задача',
        error: parsed.error,
        values: req.body,
      });
    }
    store.create(parsed);
    res.redirect('/?notice=created');
  });

  router.get('/tasks/:id', (req, res) => {
    const task = store.get(req.params.id);
    if (!task) {
      return res.status(404).render('not-found', { title: 'Задача не найдена' });
    }
    const notice = typeof req.query.notice === 'string' ? req.query.notice : null;
    const error = typeof req.query.error === 'string' ? req.query.error : null;
    res.render('task', { title: task.title, task, notice, error });
  });

  router.post('/tasks/:id', (req, res) => {
    const task = store.get(req.params.id);
    if (!task) {
      return res.status(404).render('not-found', { title: 'Задача не найдена' });
    }
    const parsed = parseTaskInput(req.body);
    if ('error' in parsed) {
      return res.status(400).render('task', {
        title: task.title,
        task,
        notice: null,
        error: parsed.error,
      });
    }
    store.update(task.id, parsed);
    res.redirect(`/tasks/${task.id}?notice=updated`);
  });

  router.post('/tasks/:id/delete', (req, res) => {
    store.remove(req.params.id);
    res.redirect('/?notice=deleted');
  });

  router.post('/tasks/:id/files', (req: Request, res: Response, next: NextFunction) => {
    if (!store.get(req.params.id)) {
      return res.status(404).render('not-found', { title: 'Задача не найдена' });
    }
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        return res.redirect(`/tasks/${req.params.id}?error=${encodeURIComponent(uploadErrorMessage(err))}`);
      }
      next();
    });
  }, (req, res) => {
    const task = store.get(req.params.id);
    if (!task || !req.file) {
      return res.redirect(`/tasks/${req.params.id}?error=${encodeURIComponent('Выберите файл для загрузки.')}`);
    }
    store.addAttachment(task.id, req.file);
    res.redirect(`/tasks/${task.id}?notice=file-added`);
  });

  router.get('/tasks/:id/files/:fileId', (req, res) => {
    const found = store.getAttachment(req.params.id, req.params.fileId);
    if (!found) {
      return res.status(404).render('not-found', { title: 'Файл не найден' });
    }
    const filePath = path.join(UPLOADS_DIR, found.task.id, found.attachment.storedName);
    res.download(filePath, found.attachment.originalName);
  });

  router.post('/tasks/:id/files/:fileId/delete', (req, res) => {
    const ok = store.removeAttachment(req.params.id, req.params.fileId);
    if (!ok) {
      return res.status(404).render('not-found', { title: 'Файл не найден' });
    }
    res.redirect(`/tasks/${req.params.id}?notice=file-removed`);
  });

  return router;
}
