import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Session } from '../src/models/Session';
import { Film } from '../src/models/Film';
import { PasswordReset } from '../src/models/PasswordReset';
import { hashPassword } from '../src/auth/password';
import { clearMailOutbox, mailOutbox } from '../src/auth/mail';
import { resetRateLimits } from '../src/middleware/rate-limit';
import type { Role } from '../src/types';

const app = createApp();
let memory: MongoMemoryServer | undefined;

async function createAccount(email: string, password: string, role: Role) {
  return User.create({ email, passwordHash: await hashPassword(password), role });
}

async function login(email: string, password: string) {
  return request(app).post('/api/auth/login').send({ email, password });
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  const uri = process.env.TEST_MONGO_URI;
  if (uri) {
    await mongoose.connect(uri);
    return;
  }
  memory = await MongoMemoryServer.create();
  await mongoose.connect(memory.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (memory) {
    await memory.stop();
  }
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Session.deleteMany({}),
    Film.deleteMany({}),
    PasswordReset.deleteMany({}),
  ]);
  clearMailOutbox();
  resetRateLimits();
});

describe('HTTP-семантика', () => {
  it('отдаёт 404 с кодом NOT_FOUND на неизвестный маршрут', async () => {
    const res = await request(app).get('/api/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.message).toMatch(/не найден/i);
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('отдаёт 400 INVALID_JSON на битый JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_JSON');
  });

  it('отдаёт 400 VALIDATION_ERROR на пустой логин', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details?.length).toBeGreaterThan(0);
  });

  it('health остаётся публичным', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('Роли и временные ключи', () => {
  it('без ключа доступа фильмы недоступны — 401', async () => {
    const res = await request(app).get('/api/films');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('viewer читает, но не создаёт и не удаляет', async () => {
    await createAccount('viewer@test.local', 'password1', 'viewer');
    const tokens = await login('viewer@test.local', 'password1');
    expect(tokens.status).toBe(200);
    expect(tokens.body.tokenType).toBe('Bearer');
    expect(tokens.body.accessToken).toBeTruthy();
    expect(tokens.body.user.role).toBe('viewer');

    const list = await request(app).get('/api/films').set(auth(tokens.body.accessToken));
    expect(list.status).toBe(200);

    const created = await request(app)
      .post('/api/films')
      .set(auth(tokens.body.accessToken))
      .send({ title: 'Драйв', director: 'Рефит Анан', status: 'planned', year: 2011, rating: null, notes: '' });
    expect(created.status).toBe(403);
    expect(created.body.code).toBe('FORBIDDEN');
  });

  it('editor создаёт фильм (201), admin удаляет (204)', async () => {
    await createAccount('editor@test.local', 'password1', 'editor');
    await createAccount('admin@test.local', 'password1', 'admin');
    const editor = await login('editor@test.local', 'password1');
    const admin = await login('admin@test.local', 'password1');

    const created = await request(app)
      .post('/api/films')
      .set(auth(editor.body.accessToken))
      .send({ title: 'Драйв', director: 'Рефит Анан', status: 'planned', year: 2011, rating: null, notes: '' });
    expect(created.status).toBe(201);
    expect(created.body.id).toBeTruthy();

    const removedByEditor = await request(app)
      .delete(`/api/films/${created.body.id}`)
      .set(auth(editor.body.accessToken));
    expect(removedByEditor.status).toBe(403);

    const removedByAdmin = await request(app)
      .delete(`/api/films/${created.body.id}`)
      .set(auth(admin.body.accessToken));
    expect(removedByAdmin.status).toBe(204);
  });

  it('refresh выдаёт новую пару ключей, старый refresh больше не работает', async () => {
    await createAccount('user@test.local', 'password1', 'viewer');
    const first = await login('user@test.local', 'password1');
    const refreshed = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: first.body.refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).not.toBe(first.body.accessToken);
    expect(refreshed.body.refreshToken).not.toBe(first.body.refreshToken);

    const reused = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: first.body.refreshToken });
    expect(reused.status).toBe(401);
    expect(reused.body.code).toBe('REFRESH_INVALID');
  });
});

describe('Подбор пароля, сессии, почта', () => {
  it('блокирует аккаунт после трёх неверных попыток — 429', async () => {
    await createAccount('lock@test.local', 'password1', 'viewer');

    const first = await login('lock@test.local', 'wrong-pass');
    expect(first.status).toBe(401);
    const second = await login('lock@test.local', 'wrong-pass');
    expect(second.status).toBe(401);
    const third = await login('lock@test.local', 'wrong-pass');
    expect(third.status).toBe(429);
    expect(third.body.code).toBe('ACCOUNT_LOCKED');
    expect(third.headers['retry-after']).toBeTruthy();

    const evenValid = await login('lock@test.local', 'password1');
    expect(evenValid.status).toBe(429);
  });

  it('вытесняет старую сессию при превышении лимита', async () => {
    await createAccount('sess@test.local', 'password1', 'viewer');
    const a = await login('sess@test.local', 'password1');
    const b = await login('sess@test.local', 'password1');
    const c = await login('sess@test.local', 'password1');
    expect(c.status).toBe(200);

    const oldRefresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: a.body.refreshToken });
    expect(oldRefresh.status).toBe(401);

    const stillAlive = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: b.body.refreshToken });
    expect(stillAlive.status).toBe(200);
  });

  it('отзыв сессии сразу закрывает доступ', async () => {
    await createAccount('out@test.local', 'password1', 'viewer');
    const tokens = await login('out@test.local', 'password1');
    const sessions = await request(app).get('/api/auth/sessions').set(auth(tokens.body.accessToken));
    expect(sessions.status).toBe(200);
    expect(sessions.body[0].current).toBe(true);

    const revoked = await request(app)
      .delete(`/api/auth/sessions/${sessions.body[0].id}`)
      .set(auth(tokens.body.accessToken));
    expect(revoked.status).toBe(204);

    const me = await request(app).get('/api/auth/me').set(auth(tokens.body.accessToken));
    expect(me.status).toBe(401);
    expect(me.body.code).toBe('SESSION_REVOKED');
  });

  it('восстанавливает пароль по одноразовой ссылке из письма', async () => {
    await createAccount('mail@test.local', 'password1', 'viewer');
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'mail@test.local' });
    expect(forgot.status).toBe(202);

    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@test.local' });
    expect(unknown.status).toBe(202);

    const letter = mailOutbox.find((item) => item.to === 'mail@test.local');
    expect(letter).toBeTruthy();
    const token = letter!.text.match(/token=([a-f0-9]+)/)?.[1];
    expect(token).toBeTruthy();

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newpass12' });
    expect(reset.status).toBe(200);

    const oldLogin = await login('mail@test.local', 'password1');
    expect(oldLogin.status).toBe(401);

    const newLogin = await login('mail@test.local', 'newpass12');
    expect(newLogin.status).toBe(200);

    const reused = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'another12' });
    expect(reused.status).toBe(400);
    expect(reused.body.code).toBe('RESET_INVALID');
  });
});
