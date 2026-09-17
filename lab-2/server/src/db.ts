import mongoose from 'mongoose';
import { config } from './config';

export async function connectMongo(): Promise<void> {
  const attempts = 30;
  let lastError: unknown;

  for (let i = 1; i <= attempts; i += 1) {
    try {
      await mongoose.connect(config.mongoUri);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Не удалось подключиться к MongoDB');
}
