import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/winston';

export function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const startedAt = Date.now();

    res.on('finish', () => {
        const level = res.statusCode >= 500
            ? 'error'
            : res.statusCode >= 400
                ? 'warn'
                : 'info';

        logger.log(level, 'http_request', {
            requestId: req.requestId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            userId: req.user?.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });
    });

    next();
}
