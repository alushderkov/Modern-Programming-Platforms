import type { Request } from 'express';
import { isTaskStatus, type TaskInput, type TaskStatus } from './types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Ожидает',
  in_progress: 'В работе',
  done: 'Выполнена',
};

export function parseDueDate(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function parseTaskInput(body: Request['body']): TaskInput | { error: string } {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 1 || title.length > 120) {
    return { error: 'Название обязательно и должно быть не длиннее 120 символов.' };
  }

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const statusRaw = typeof body.status === 'string' ? body.status : 'pending';
  if (!isTaskStatus(statusRaw)) {
    return { error: 'Некорректный статус задачи.' };
  }

  return {
    title,
    description,
    status: statusRaw,
    dueDate: parseDueDate(body.dueDate),
  };
}

export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} Б`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} КБ`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'done') {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${dueDate}T00:00:00`) < today;
}
