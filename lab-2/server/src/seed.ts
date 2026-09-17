import { Film } from './models/Film';

export async function seedIfEmpty(): Promise<void> {
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
