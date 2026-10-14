import type { RequestHandler } from 'express';
import { HttpError } from '../errors';
import { Session } from '../models/Session';
import { User } from '../models/User';
import { hasMinRole, type Role } from '../types';
import { verifyAccessToken } from '../auth/tokens';

function readBearer(header: string | undefined): string {
  if (!header || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Нужен ключ доступа (заголовок Authorization: Bearer)');
  }
  const token = header.slice(7).trim();
  if (!token) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Нужен ключ доступа (заголовок Authorization: Bearer)');
  }
  return token;
}

export const requireAuth = (minimum: Role = 'viewer'): RequestHandler =>
  async (req, _res, next) => {
    try {
      const token = readBearer(req.headers.authorization);
      const claims = verifyAccessToken(token);
      const session = await Session.findById(claims.sid);
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        throw new HttpError(401, 'SESSION_REVOKED', 'Сессия отозвана или истекла');
      }
      if (session.userId.toString() !== claims.sub) {
        throw new HttpError(401, 'TOKEN_INVALID', 'Ключ доступа недействителен');
      }
      const user = await User.findById(claims.sub);
      if (!user) {
        throw new HttpError(401, 'TOKEN_INVALID', 'Ключ доступа недействителен');
      }
      if (!hasMinRole(user.role as Role, minimum)) {
        throw new HttpError(403, 'FORBIDDEN', `Недостаточно прав: нужна роль ${minimum} или выше`);
      }
      session.lastSeenAt = new Date();
      await session.save();
      req.auth = {
        id: user._id.toString(),
        email: user.email,
        role: user.role as Role,
        sessionId: session._id.toString(),
      };
      next();
    } catch (error) {
      next(error);
    }
  };
