import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      JWT_SECRET: 'test-secret-lab3',
      MAX_LOGIN_ATTEMPTS: '3',
      LOCKOUT_MINUTES: '15',
      MAX_SESSIONS: '2',
      JWT_ACCESS_TTL_SEC: '900',
      JWT_REFRESH_TTL_SEC: '86400',
    },
    hookTimeout: 120000,
    testTimeout: 30000,
    fileParallelism: false,
  },
});
