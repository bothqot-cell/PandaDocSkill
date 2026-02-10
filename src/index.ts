import { createApp } from './app';
import { config } from './config/config';
import { logger } from './utils/logger';

const app = createApp();

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Server listening');
});
