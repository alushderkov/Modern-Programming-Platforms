import path from 'node:path';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { UPLOADS_DIR } from './store';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const taskId = req.params.id;
    const dir = path.join(UPLOADS_DIR, taskId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const safeName = originalName.replace(/[\\/]/g, '_');
    cb(null, `${randomUUID()}__${safeName}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});
