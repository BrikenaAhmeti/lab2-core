import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const env = {
    port: Number(process.env.PORT || 3006),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
    frontendOrigins: process.env.FRONTEND_ORIGINS || '',
    redisUrl: process.env.REDIS_URL || '',
    mongodbUri: process.env.MONGODB_URI || '',
    internalApiKey: process.env.INTERNAL_API_KEY || '',
    authServiceUrl: process.env.AUTH_SERVICE_URL || '',
    aiServiceUrl: process.env.AI_SERVICE_URL || '',
    notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || '',
    logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
    sentryDsn: process.env.SENTRY_DSN || '',
    auditLoggingEnabled:
        process.env.AUDIT_LOGGING_ENABLED !== 'false' && process.env.NODE_ENV !== 'test',
};
