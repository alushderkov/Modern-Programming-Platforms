import { z } from 'zod';
import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { FILM_STATUSES, ROLES } from './types';
import { HttpError } from './errors';

const emptyToNull = (value: unknown) => {
  if (value === '' || value === undefined || value === null) {
    return null;
  }
  return value;
};

const yearSchema = z.preprocess(
  emptyToNull,
  z.union([
    z.null(),
    z.coerce.number().int().min(1888, 'Год не раньше 1888').max(2100, 'Год слишком большой'),
  ]),
);

const ratingSchema = z.preprocess(
  emptyToNull,
  z.union([
    z.null(),
    z.coerce.number().int().min(1, 'Оценка от 1').max(10, 'Оценка до 10'),
  ]),
);

const emailSchema = z
  .string({ required_error: 'Email обязателен' })
  .trim()
  .email('Некорректный email')
  .max(120, 'Email слишком длинный')
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string({ required_error: 'Пароль обязателен' })
  .min(8, 'Пароль не короче 8 символов')
  .max(72, 'Пароль длиннее 72 символов');

export const filmBodySchema = z.object({
  title: z.string({ required_error: 'Название обязательно' }).trim().min(1, 'Название обязательно').max(120, 'Название длиннее 120 символов'),
  director: z.string({ required_error: 'Режиссёр обязателен' }).trim().min(1, 'Режиссёр обязателен').max(120, 'Имя режиссёра длиннее 120 символов'),
  year: yearSchema.optional().default(null),
  status: z.enum(FILM_STATUSES, {
    errorMap: () => ({ message: 'Статус: planned, watching или watched' }),
  }),
  rating: ratingSchema.optional().default(null),
  notes: z.preprocess((value) => (value === undefined || value === null ? '' : value), z.string().max(2000, 'Заметки длиннее 2000 символов')),
});

export const listQuerySchema = z.object({
  status: z.enum(FILM_STATUSES, {
    errorMap: () => ({ message: 'Статус: planned, watching или watched' }),
  }).optional(),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'Пароль обязателен' }).min(1, 'Пароль обязателен'),
});

export const refreshSchema = z.object({
  refreshToken: z.string({ required_error: 'Нет ключа обновления' }).min(10, 'Нет ключа обновления'),
});

export const forgotSchema = z.object({
  email: emailSchema,
});

export const resetSchema = z.object({
  token: z.string({ required_error: 'Нет токена' }).min(10, 'Токен восстановления некорректен'),
  password: passwordSchema,
});

export const rolePatchSchema = z.object({
  role: z.enum(ROLES, {
    errorMap: () => ({ message: 'Роль: viewer, editor или admin' }),
  }),
});

export type FilmBody = z.infer<typeof filmBodySchema>;
export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
export type ForgotBody = z.infer<typeof forgotSchema>;
export type ResetBody = z.infer<typeof resetSchema>;
export type RolePatchBody = z.infer<typeof rolePatchSchema>;

function issuesOf(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, 'VALIDATION_ERROR', 'Некорректные данные', issuesOf(parsed.error)));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(new HttpError(400, 'VALIDATION_ERROR', 'Некорректные параметры запроса', issuesOf(parsed.error)));
      return;
    }
    res.locals.query = parsed.data;
    next();
  };
}

export function requireId(notFoundMessage = 'Ресурс не найден'): RequestHandler {
  return (req, _res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      next(new HttpError(400, 'INVALID_ID', notFoundMessage === 'Ресурс не найден' ? 'Некорректный идентификатор' : notFoundMessage));
      return;
    }
    next();
  };
}
