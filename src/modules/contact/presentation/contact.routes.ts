import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { ContactController } from './contact.controller';

const controller = new ContactController();

export const contactRoutes = Router();

contactRoutes.post('/', async (req, res, next) => {
    try {
        await controller.submit(req, res);
    } catch (error) {
        next(error);
    }
});

contactRoutes.get(
    '/',
    authMiddleware,
    requirePermission('contact:read', 'all'),
    async (req, res, next) => {
        try {
            await controller.list(req, res);
        } catch (error) {
            next(error);
        }
    },
);

contactRoutes.patch(
    '/:id/status',
    authMiddleware,
    requirePermission('contact:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.updateStatus(req, res);
        } catch (error) {
            next(error);
        }
    },
);
