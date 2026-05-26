import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { FeedbackController } from './feedback.controller';

const controller = new FeedbackController();

export const feedbackRoutes = Router();

feedbackRoutes.post('/', authMiddleware, async (req, res, next) => {
    try {
        await controller.submit(req, res);
    } catch (error) {
        next(error);
    }
});

feedbackRoutes.get('/my', authMiddleware, async (req, res, next) => {
    try {
        await controller.my(req, res);
    } catch (error) {
        next(error);
    }
});

feedbackRoutes.get(
    '/',
    authMiddleware,
    requirePermission('feedback:read'),
    async (req, res, next) => {
        try {
            await controller.list(req, res);
        } catch (error) {
            next(error);
        }
    },
);

feedbackRoutes.patch(
    '/:id/status',
    authMiddleware,
    requirePermission('feedback:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.updateStatus(req, res);
        } catch (error) {
            next(error);
        }
    },
);
