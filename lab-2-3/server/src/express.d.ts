import type { AuthUser } from './types';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      id?: string;
    }
  }
}

export {};
