import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Attachment, Task, TaskInput, TaskStatus } from './types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');
export const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function nowIso(): string {
  return new Date().toISOString();
}

function seedTasks(): Task[] {
  const now = nowIso();
  return [
    {
      id: randomUUID(),
      title: 'Оформить отчёт по лабораторной №1',
      description: 'Описать SSR, формы и хранение вложений. Приложить скриншоты работающего приложения.',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
      attachments: [],
    },
    {
      id: randomUUID(),
      title: 'Прочитать главу про шаблонизаторы',
      description: 'EJS: include, локали, экранирование HTML.',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
      attachments: [],
    },
    {
      id: randomUUID(),
      title: 'Настроить окружение Node.js',
      description: 'Установлены Node 18+, npm, TypeScript.',
      status: 'done',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
      attachments: [],
    },
  ];
}

export class TaskStore {
  private tasks: Task[] = [];

  constructor() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    this.load();
  }

  list(status?: TaskStatus | 'all'): Task[] {
    const items = [...this.tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (!status || status === 'all') {
      return items;
    }
    return items.filter((task) => task.status === status);
  }

  get(id: string): Task | undefined {
    return this.tasks.find((task) => task.id === id);
  }

  create(input: TaskInput): Task {
    const timestamp = nowIso();
    const task: Task = {
      id: randomUUID(),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
      attachments: [],
    };
    this.tasks.push(task);
    this.persist();
    return task;
  }

  update(id: string, input: TaskInput): Task | undefined {
    const task = this.get(id);
    if (!task) {
      return undefined;
    }
    task.title = input.title;
    task.description = input.description;
    task.status = input.status;
    task.dueDate = input.dueDate;
    task.updatedAt = nowIso();
    this.persist();
    return task;
  }

  remove(id: string): boolean {
    const index = this.tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      return false;
    }
    this.tasks.splice(index, 1);
    this.persist();
    const uploadDir = path.join(UPLOADS_DIR, id);
    fs.rmSync(uploadDir, { recursive: true, force: true });
    return true;
  }

  addAttachment(
    taskId: string,
    file: { originalname: string; filename: string; mimetype: string; size: number },
  ): Attachment | undefined {
    const task = this.get(taskId);
    if (!task) {
      return undefined;
    }
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const attachment: Attachment = {
      id: randomUUID(),
      originalName,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: nowIso(),
    };
    task.attachments.push(attachment);
    task.updatedAt = nowIso();
    this.persist();
    return attachment;
  }

  getAttachment(taskId: string, fileId: string): { task: Task; attachment: Attachment } | undefined {
    const task = this.get(taskId);
    if (!task) {
      return undefined;
    }
    const attachment = task.attachments.find((item) => item.id === fileId);
    if (!attachment) {
      return undefined;
    }
    return { task, attachment };
  }

  removeAttachment(taskId: string, fileId: string): boolean {
    const found = this.getAttachment(taskId, fileId);
    if (!found) {
      return false;
    }
    const { task, attachment } = found;
    task.attachments = task.attachments.filter((item) => item.id !== fileId);
    task.updatedAt = nowIso();
    this.persist();
    const filePath = path.join(UPLOADS_DIR, taskId, attachment.storedName);
    fs.rmSync(filePath, { force: true });
    return true;
  }

  private load(): void {
    if (!fs.existsSync(DATA_FILE)) {
      this.tasks = seedTasks();
      this.persist();
      return;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    this.tasks = JSON.parse(raw) as Task[];
  }

  private persist(): void {
    fs.writeFileSync(DATA_FILE, JSON.stringify(this.tasks, null, 2), 'utf8');
  }
}
