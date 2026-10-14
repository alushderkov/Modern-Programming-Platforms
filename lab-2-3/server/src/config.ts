import path from 'node:path';

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export const config = {
  port: numberEnv('PORT', 4000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kadr',
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  jwtSecret: process.env.JWT_SECRET || 'kadr-lab-dev-secret-change-me',
  accessTtlSec: numberEnv('JWT_ACCESS_TTL_SEC', 15 * 60),
  refreshTtlSec: numberEnv('JWT_REFRESH_TTL_SEC', 7 * 24 * 60 * 60),
  resetTtlSec: numberEnv('RESET_TTL_SEC', 60 * 60),
  maxLoginAttempts: numberEnv('MAX_LOGIN_ATTEMPTS', 5),
  lockoutMinutes: numberEnv('LOCKOUT_MINUTES', 15),
  maxSessions: numberEnv('MAX_SESSIONS', 5),
  loginRateMax: numberEnv('LOGIN_RATE_MAX', 20),
  loginRateWindowMs: numberEnv('LOGIN_RATE_WINDOW_MS', 10 * 60 * 1000),
  forgotRateMax: numberEnv('FORGOT_RATE_MAX', 5),
  forgotRateWindowMs: numberEnv('FORGOT_RATE_WINDOW_MS', 15 * 60 * 1000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  mailFrom: process.env.MAIL_FROM || 'Кадр <noreply@kadr.local>',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: numberEnv('SMTP_PORT', 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};
