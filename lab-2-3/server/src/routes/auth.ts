import { Router } from 'express';
import { config } from '../config';
import { HttpError } from '../errors';
import { asyncHandler } from '../async-handler';
import {
  changeRole,
  listSessions,
  loginUser,
  logoutSession,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resetPassword,
  revokeAllSessions,
  revokeSession,
  toUserDto,
} from '../auth/service';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rate-limit';
import { User } from '../models/User';
import {
  forgotSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  requireId,
  resetSchema,
  rolePatchSchema,
  validateBody,
} from '../validation';
import type { ForgotBody, LoginBody, RefreshBody, RegisterBody, ResetBody, RolePatchBody } from '../validation';

export const authRouter = Router();

authRouter.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as RegisterBody;
    const tokens = await registerUser(body.email, body.password, req);
    res.status(201).json(tokens);
  }),
);

authRouter.post(
  '/login',
  rateLimit({ windowMs: config.loginRateWindowMs, max: config.loginRateMax, keyPrefix: 'login' }),
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as LoginBody;
    const tokens = await loginUser(body.email, body.password, req);
    res.status(200).json(tokens);
  }),
);

authRouter.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as RefreshBody;
    const tokens = await refreshSession(body.refreshToken, req);
    res.status(200).json(tokens);
  }),
);

authRouter.post(
  '/logout',
  requireAuth('viewer'),
  asyncHandler(async (req, res) => {
    await logoutSession(req.auth!.sessionId, req.auth!.id);
    res.status(204).end();
  }),
);

authRouter.get(
  '/me',
  requireAuth('viewer'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth!.id);
    if (!user) {
      throw new HttpError(401, 'TOKEN_INVALID', 'Ключ доступа недействителен');
    }
    res.status(200).json(toUserDto(user));
  }),
);

authRouter.post(
  '/forgot-password',
  rateLimit({ windowMs: config.forgotRateWindowMs, max: config.forgotRateMax, keyPrefix: 'forgot' }),
  validateBody(forgotSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ForgotBody;
    await requestPasswordReset(body.email);
    res.status(202).json({
      status: 202,
      message: 'Если аккаунт существует, письмо со ссылкой восстановления отправлено',
    });
  }),
);

authRouter.post(
  '/reset-password',
  validateBody(resetSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ResetBody;
    await resetPassword(body.token, body.password);
    res.status(200).json({ status: 200, message: 'Пароль обновлён. Войдите с новым паролем.' });
  }),
);

authRouter.get(
  '/sessions',
  requireAuth('viewer'),
  asyncHandler(async (req, res) => {
    const sessions = await listSessions(req.auth!.id, req.auth!.sessionId);
    res.status(200).json(sessions);
  }),
);

authRouter.delete(
  '/sessions',
  requireAuth('viewer'),
  asyncHandler(async (req, res) => {
    const count = await revokeAllSessions(req.auth!.id, req.auth!.sessionId);
    res.status(200).json({ ok: true, revoked: count });
  }),
);

authRouter.delete(
  '/sessions/:id',
  requireAuth('viewer'),
  requireId('Некорректный идентификатор сессии'),
  asyncHandler(async (req, res) => {
    await revokeSession(req.auth!.id, req.params.id);
    res.status(204).end();
  }),
);

export const usersRouter = Router();

usersRouter.get(
  '/',
  requireAuth('admin'),
  asyncHandler(async (_req, res) => {
    const users = await User.find().sort({ createdAt: 1 });
    res.status(200).json(users.map((user) => toUserDto(user)));
  }),
);

usersRouter.patch(
  '/:id',
  requireAuth('admin'),
  requireId('Некорректный идентификатор пользователя'),
  validateBody(rolePatchSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as RolePatchBody;
    const user = await changeRole(req.auth!.id, req.params.id, body.role);
    res.status(200).json(user);
  }),
);
