import type { Request } from 'express';
import { config } from '../config';
import { HttpError } from '../errors';
import { logger } from '../logger';
import { PasswordReset } from '../models/PasswordReset';
import { Session } from '../models/Session';
import { User, type UserDocument } from '../models/User';
import { clientIp } from '../middleware/rate-limit';
import type { Role, TokenPair, UserDto } from '../types';
import { hashPassword, verifyPassword } from './password';
import { hashToken, randomToken, signAccessToken } from './tokens';
import { sendPasswordResetMail } from './mail';

export function toUserDto(user: UserDocument): UserDto {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role as Role,
    createdAt: user.createdAt.toISOString(),
  };
}

function tokenPair(user: UserDocument, sessionId: string, refreshToken: string): TokenPair {
  return {
    accessToken: signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role as Role,
      sid: sessionId,
    }),
    refreshToken,
    expiresIn: config.accessTtlSec,
    tokenType: 'Bearer',
    user: toUserDto(user),
  };
}

async function ensureSessionSlot(userId: UserDocument['_id']): Promise<void> {
  const active = await Session.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: 1 });

  const overflow = active.length - config.maxSessions + 1;
  if (overflow <= 0) {
    return;
  }

  const victims = active.slice(0, overflow);
  await Session.updateMany(
    { _id: { $in: victims.map((item) => item._id) } },
    { $set: { revokedAt: new Date() } },
  );
  logger.warn({
    event: 'auth.session.evicted',
    userId: userId.toString(),
    count: overflow,
    sessionIds: victims.map((item) => item._id.toString()),
  });
}

async function createSession(user: UserDocument, req: Request): Promise<TokenPair> {
  await ensureSessionSlot(user._id);
  const refreshToken = randomToken();
  const session = await Session.create({
    userId: user._id,
    refreshTokenHash: hashToken(refreshToken),
    ip: clientIp(req),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    expiresAt: new Date(Date.now() + config.refreshTtlSec * 1000),
    lastSeenAt: new Date(),
  });
  logger.info({
    event: 'auth.session.created',
    userId: user._id.toString(),
    sessionId: session._id.toString(),
    ip: session.ip,
    role: user.role,
  });
  return tokenPair(user, session._id.toString(), refreshToken);
}

function lockRetryAfter(lockedUntil: Date): Record<string, string> {
  const retryAfter = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
  return { 'Retry-After': String(retryAfter) };
}

export async function registerUser(email: string, password: string, req: Request): Promise<TokenPair> {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'Пользователь с таким email уже есть');
  }
  const user = await User.create({
    email,
    passwordHash: await hashPassword(password),
    role: 'viewer',
  });
  logger.info({ event: 'auth.register', userId: user._id.toString(), email, role: user.role });
  return createSession(user, req);
}

export async function loginUser(email: string, password: string, req: Request): Promise<TokenPair> {
  const user = await User.findOne({ email });
  const now = new Date();

  if (!user) {
    logger.warn({ event: 'auth.login.failed', email, ip: clientIp(req), reason: 'unknown_user' });
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Неверный email или пароль');
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    logger.warn({
      event: 'auth.login.locked',
      userId: user._id.toString(),
      email,
      ip: clientIp(req),
      lockedUntil: user.lockedUntil.toISOString(),
    });
    throw new HttpError(
      429,
      'ACCOUNT_LOCKED',
      'Аккаунт временно заблокирован после нескольких неверных попыток',
      undefined,
      lockRetryAfter(user.lockedUntil),
    );
  }

  if (user.lockedUntil && user.lockedUntil <= now) {
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= config.maxLoginAttempts) {
      user.lockedUntil = new Date(Date.now() + config.lockoutMinutes * 60 * 1000);
      await user.save();
      logger.warn({
        event: 'auth.login.lockout',
        userId: user._id.toString(),
        email,
        ip: clientIp(req),
        attempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil.toISOString(),
      });
      throw new HttpError(
        429,
        'ACCOUNT_LOCKED',
        'Аккаунт временно заблокирован после нескольких неверных попыток',
        undefined,
        lockRetryAfter(user.lockedUntil),
      );
    }
    await user.save();
    logger.warn({
      event: 'auth.login.failed',
      userId: user._id.toString(),
      email,
      ip: clientIp(req),
      reason: 'bad_password',
      attempts: user.failedLoginAttempts,
    });
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Неверный email или пароль');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();
  logger.info({ event: 'auth.login.success', userId: user._id.toString(), email, ip: clientIp(req) });
  return createSession(user, req);
}

export async function refreshSession(refreshToken: string, req: Request): Promise<TokenPair> {
  const session = await Session.findOne({ refreshTokenHash: hashToken(refreshToken) });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    logger.warn({ event: 'auth.refresh.denied', ip: clientIp(req) });
    throw new HttpError(401, 'REFRESH_INVALID', 'Ключ обновления недействителен или отозван');
  }

  const user = await User.findById(session.userId);
  if (!user) {
    session.revokedAt = new Date();
    await session.save();
    throw new HttpError(401, 'REFRESH_INVALID', 'Ключ обновления недействителен или отозван');
  }

  const nextRefresh = randomToken();
  session.refreshTokenHash = hashToken(nextRefresh);
  session.lastSeenAt = new Date();
  session.ip = clientIp(req);
  session.userAgent = String(req.headers['user-agent'] || session.userAgent || '').slice(0, 300);
  await session.save();

  logger.info({
    event: 'auth.refresh',
    userId: user._id.toString(),
    sessionId: session._id.toString(),
  });
  return tokenPair(user, session._id.toString(), nextRefresh);
}

export async function logoutSession(sessionId: string, userId: string): Promise<void> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (session && !session.revokedAt) {
    session.revokedAt = new Date();
    await session.save();
    logger.info({ event: 'auth.logout', userId, sessionId });
  }
}

export async function listSessions(userId: string, currentSessionId: string) {
  const sessions = await Session.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ lastSeenAt: -1 });

  return sessions.map((session) => ({
    id: session._id.toString(),
    ip: session.ip,
    userAgent: session.userAgent,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    current: session._id.toString() === currentSessionId,
  }));
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session || session.revokedAt) {
    throw new HttpError(404, 'SESSION_NOT_FOUND', 'Сессия не найдена');
  }
  session.revokedAt = new Date();
  await session.save();
  logger.info({ event: 'auth.session.revoked', userId, sessionId });
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const filter: Record<string, unknown> = { userId, revokedAt: null };
  if (exceptSessionId) {
    filter._id = { $ne: exceptSessionId };
  }
  const result = await Session.updateMany(filter, { $set: { revokedAt: new Date() } });
  logger.info({ event: 'auth.session.revoked_all', userId, count: result.modifiedCount });
  return result.modifiedCount;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user) {
    logger.info({ event: 'auth.recovery.unknown_email', email });
    return;
  }

  await PasswordReset.updateMany({ userId: user._id, usedAt: null }, { $set: { usedAt: new Date() } });
  const token = randomToken();
  await PasswordReset.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + config.resetTtlSec * 1000),
  });
  logger.info({ event: 'auth.recovery.requested', userId: user._id.toString(), email });
  await sendPasswordResetMail(user.email, token);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const reset = await PasswordReset.findOne({ tokenHash: hashToken(token) });
  if (!reset || reset.usedAt) {
    throw new HttpError(400, 'RESET_INVALID', 'Ссылка восстановления недействительна');
  }
  if (reset.expiresAt <= new Date()) {
    throw new HttpError(410, 'RESET_EXPIRED', 'Срок действия ссылки восстановления истёк');
  }

  const user = await User.findById(reset.userId);
  if (!user) {
    throw new HttpError(400, 'RESET_INVALID', 'Ссылка восстановления недействительна');
  }

  user.passwordHash = await hashPassword(password);
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  reset.usedAt = new Date();
  await reset.save();
  await revokeAllSessions(user._id.toString());
  logger.info({ event: 'auth.recovery.completed', userId: user._id.toString() });
}

export async function changeRole(actorId: string, targetId: string, role: Role): Promise<UserDto> {
  const target = await User.findById(targetId);
  if (!target) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'Пользователь не найден');
  }
  if (target._id.toString() === actorId && role !== 'admin') {
    throw new HttpError(409, 'LAST_ADMIN', 'Нельзя снять с себя роль администратора');
  }
  target.role = role;
  await target.save();
  logger.info({ event: 'auth.role.changed', actorId, userId: targetId, role });
  return toUserDto(target);
}
