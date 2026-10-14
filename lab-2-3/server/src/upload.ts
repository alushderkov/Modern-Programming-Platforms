import fs from 'node:fs';
import path from 'node:path';
import multer, { MulterError } from 'multer';
import { randomUUID } from 'node:crypto';
import { config } from './config';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName).slice(0, 8);
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const posterUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_TYPES.has(file.mimetype)) {
      cb(new Error('Постер должен быть изображением JPEG, PNG, WebP или GIF'));
      return;
    }
    cb(null, true);
  },
});

export function multerMessage(err: unknown): string {
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return 'Файл больше 5 МБ';
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Не удалось загрузить файл';
}
