import { createApp } from './app';
import { config } from './config';
import { connectMongo } from './db';
import { seedIfEmpty } from './seed';
import { logger } from './logger';

async function main(): Promise<void> {
  await connectMongo();
  await seedIfEmpty();
  const app = createApp();
  app.listen(config.port, () => {
    logger.info({ event: 'server.listen', port: config.port, env: config.nodeEnv, msg: `API http://localhost:${config.port}` });
  });
}

main().catch((error) => {
  logger.fatal({ event: 'server.fatal', err: error });
  process.exit(1);
});
