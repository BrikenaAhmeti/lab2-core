import * as Sentry from '@sentry/node';
import { env } from '../../config/env';
import { logger } from './winston';

let initialized = false;

export function initSentry() {
    if (!env.sentryDsn || initialized) {
        return;
    }

    Sentry.init({
        dsn: env.sentryDsn,
        environment: env.nodeEnv,
    });
    initialized = true;
    logger.info('Sentry initialized');
}

export function captureError(error: Error, context?: Record<string, unknown>) {
    if (!initialized) {
        return;
    }

    Sentry.withScope((scope) => {
        if (context) {
            for (const [key, value] of Object.entries(context)) {
                scope.setExtra(key, value);
            }
        }

        Sentry.captureException(error);
    });
}
