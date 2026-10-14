import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../errors';
import type { Role } from '../types';

export interface AccessClaims {
  sub: string;
  email: string;
  role: Role;
  sid: string;
  typ: 'access';
  jti: string;
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function randomToken(): string {
  return randomBytes(32).toString('hex');
}

export function signAccessToken(claims: Omit<AccessClaims, 'typ' | 'jti'>): string {
  return jwt.sign({ ...claims, typ: 'access', jti: randomUUID() }, config.jwtSecret, {
    expiresIn: config.accessTtlSec,
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AccessClaims;
    if (payload.typ !== 'access' || !payload.sub || !payload.sid || !payload.role) {
      throw new Error('bad payload');
    }
    return payload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new HttpError(401, 'TOKEN_EXPIRED', 'Срок действия ключа доступа истёк');
    }
    throw new HttpError(401, 'TOKEN_INVALID', 'Ключ доступа недействителен');
  }
}
