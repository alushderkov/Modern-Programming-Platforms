import { createApp } from './app';
import { config } from './config';
import { connectMongo } from './db';
import { seedIfEmpty } from './seed';

async function main(): Promise<void> {
  await connectMongo();
  await seedIfEmpty();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`API http://localhost:${config.port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
