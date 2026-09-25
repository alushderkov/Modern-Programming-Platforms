import { Film } from './models/Film';
import { User } from './models/User';
import { hashPassword } from './auth/password';
import { logger } from './logger';
import type { Role } from './types';

const DEMO_USERS: Array<{ email: string; password: string; role: Role }> = [
  { email: 'admin@kadr.local', password: 'admin123', role: 'admin' },
  { email: 'editor@kadr.local', password: 'editor123', role: 'editor' },
  { email: 'viewer@kadr.local', password: 'viewer123', role: 'viewer' },
];

async function seedUsers(): Promise<void> {
  const count = await User.countDocuments();
  if (count > 0) {
    return;
  }

  await User.insertMany(
    await Promise.all(
      DEMO_USERS.map(async (item) => ({
        email: item.email,
        passwordHash: await hashPassword(item.password),
        role: item.role,
      })),
    ),
  );
  logger.info({
    event: 'seed.users',
    users: DEMO_USERS.map((item) => ({ email: item.email, role: item.role })),
  });
}

async function seedFilms(): Promise<void> {
  const count = await Film.countDocuments();
  if (count > 0) {
    return;
  }

  await Film.insertMany([
    {
      title: 'Брат',
      director: 'Алексей Балабанов',
      year: 1997,
      status: 'watched',
      rating: 9,
      notes: 'Стартовый пример. Можно удалить.',
    },
    {
      title: 'Дюна: Часть вторая',
      director: 'Дени Вильнёв',
      year: 2024,
      status: 'watching',
      rating: null,
      notes: 'Досмотреть на выходных.',
    },
    {
      title: 'Сталкер',
      director: 'Андрей Тарковский',
      year: 1979,
      status: 'planned',
      rating: null,
      notes: '',
    },
  ]);
}

export async function seedIfEmpty(): Promise<void> {
  await seedUsers();
  await seedFilms();
}
