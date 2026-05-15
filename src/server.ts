import { createApp } from './app';
import { env } from './config/env';
import { initSentry } from './shared/utils/sentry';
import { logger } from './shared/utils/winston';

initSentry();
const app = createApp();

app.listen(env.port, () => {
    logger.info('server_started', { port: env.port });
});
