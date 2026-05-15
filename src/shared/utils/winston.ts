import winston from 'winston';
import { env } from '../../config/env';

const redactKeys = new Set([
    'authorization',
    'cookie',
    'password',
    'token',
    'refreshtoken',
    'accesstoken',
]);

function redact(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(redact);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                redactKeys.has(key.toLowerCase()) ? '[REDACTED]' : redact(entry),
            ]),
        );
    }

    return value;
}

export const logger = winston.createLogger({
    level: env.logLevel,
    defaultMeta: {
        service: 'core-service',
    },
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format((info) => {
            if (info.metadata) {
                info.metadata = redact(info.metadata);
            }

            return info;
        })(),
        winston.format.json(),
    ),
    transports: [new winston.transports.Console()],
});
