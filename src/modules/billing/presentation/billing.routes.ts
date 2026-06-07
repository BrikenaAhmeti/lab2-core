import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { BillingController } from './billing.controller';

const controller = new BillingController();

export const billingRoutes = Router();

billingRoutes.get(
    '/',
    authMiddleware,
    requirePermission('billing:read'),
    async (req, res, next) => {
        try {
            await controller.list(req, res);
        } catch (error) {
            next(error);
        }
    },
);

billingRoutes.get(
    '/stats',
    authMiddleware,
    requirePermission('billing:read', 'all'),
    async (req, res, next) => {
        try {
            await controller.stats(req, res);
        } catch (error) {
            next(error);
        }
    },
);

billingRoutes.get(
    '/:id',
    authMiddleware,
    requirePermission('billing:read'),
    async (req, res, next) => {
        try {
            await controller.getById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

billingRoutes.get(
    '/:id/pdf',
    authMiddleware,
    requirePermission('billing:read'),
    async (req, res, next) => {
        try {
            await controller.downloadPdf(req, res);
        } catch (error) {
            next(error);
        }
    },
);

billingRoutes.put(
    '/:id',
    authMiddleware,
    requirePermission('billing:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.update(req, res);
        } catch (error) {
            next(error);
        }
    },
);

billingRoutes.post(
    '/:id/payments',
    authMiddleware,
    requirePermission('billing:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.recordPayment(req, res);
        } catch (error) {
            next(error);
        }
    },
);

billingRoutes.post(
    '/:id/mark-paid',
    authMiddleware,
    requirePermission('billing:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.markPaid(req, res);
        } catch (error) {
            next(error);
        }
    },
);
