import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../core/errors/app-error';
import { captureError } from '../utils/sentry';
import { logger } from '../utils/winston';

export function errorHandler(
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
) {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            message: error.message,
        });
    }

    if (error instanceof ZodError) {
        return res.status(400).json({
            message: error.issues[0]?.message || 'Validation failed',
        });
    }

    logger.error('unhandled_error', {
        requestId: req.requestId,
        error,
    });
    captureError(error, {
        requestId: req.requestId,
        path: req.originalUrl,
        method: req.method,
        userId: req.user?.id,
    });

    return res.status(500).json({
        message: 'Internal server error',
    });
}
