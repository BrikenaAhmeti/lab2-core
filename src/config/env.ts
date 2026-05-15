import dotenv from 'dotenv';

dotenv.config();

export const env = {
    port: Number(process.env.PORT || 3006),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
    frontendOrigins: process.env.FRONTEND_ORIGINS || '',
    logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
    sentryDsn: process.env.SENTRY_DSN || '',
    auditLoggingEnabled:
        process.env.AUDIT_LOGGING_ENABLED !== 'false' && process.env.NODE_ENV !== 'test',
};
