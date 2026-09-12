import path from 'node:path';
import express from 'express';
import { TaskStore } from './store';
import { createTaskRouter } from './routes';
import {
  STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatSize,
  isOverdue,
} from './helpers';

export function createApp(): express.Express {
  const app = express();
  const store = new TaskStore();
  const rootDir = path.join(__dirname, '..');

  app.set('view engine', 'ejs');
  app.set('views', path.join(rootDir, 'views'));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(rootDir, 'public')));

  app.locals.statusLabels = STATUS_LABELS;
  app.locals.formatDate = formatDate;
  app.locals.formatDateTime = formatDateTime;
  app.locals.formatSize = formatSize;
  app.locals.isOverdue = isOverdue;

  app.use(createTaskRouter(store));

  app.use((_req, res) => {
    res.status(404).render('not-found', { title: 'Страница не найдена' });
  });

  return app;
}
