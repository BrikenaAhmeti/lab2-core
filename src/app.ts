import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './shared/middleware/error-handler';
import { notFoundHandler } from './shared/middleware/not-found';
import { departmentRoutes } from './modules/departments/presentation/department.routes';

export function createApp() {
    const app = express();
    const allowedOrigins = env.frontendOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.use(helmet());
    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);

                if (allowedOrigins.length === 0 && env.nodeEnv !== 'production') {
                    return callback(null, true);
                }

                if (allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                return callback(new Error('CORS policy: origin not allowed'));
            },
        }),
    );
    app.use(morgan('dev'));
    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    app.use('/api/departments', departmentRoutes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
