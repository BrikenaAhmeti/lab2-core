import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { LabController } from './lab.controller';

const controller = new LabController();

export const labTestRoutes = Router();
export const labOrderRoutes = Router();

labTestRoutes.post(
    '/',
    authMiddleware,
    requirePermission('lab_tests:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.createLabTest(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labTestRoutes.get(
    '/',
    authMiddleware,
    requirePermission('lab_tests:read'),
    async (req, res, next) => {
        try {
            await controller.listLabTests(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labTestRoutes.get(
    '/:id',
    authMiddleware,
    requirePermission('lab_tests:read'),
    async (req, res, next) => {
        try {
            await controller.getLabTestById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labTestRoutes.patch(
    '/:id',
    authMiddleware,
    requirePermission('lab_tests:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.updateLabTest(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labTestRoutes.put(
    '/:id',
    authMiddleware,
    requirePermission('lab_tests:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.updateLabTest(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labTestRoutes.delete(
    '/:id',
    authMiddleware,
    requirePermission('lab_tests:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.deactivateLabTest(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labOrderRoutes.post(
    '/',
    authMiddleware,
    requirePermission('lab_orders:create'),
    async (req, res, next) => {
        try {
            await controller.createLabOrder(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labOrderRoutes.get(
    '/',
    authMiddleware,
    requirePermission('lab_orders:read'),
    async (req, res, next) => {
        try {
            await controller.listLabOrders(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labOrderRoutes.get(
    '/pending',
    authMiddleware,
    requirePermission('lab_orders:read'),
    async (req, res, next) => {
        try {
            await controller.listPendingLabOrders(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labOrderRoutes.get(
    '/:id',
    authMiddleware,
    requirePermission('lab_orders:read'),
    async (req, res, next) => {
        try {
            await controller.getLabOrderById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labOrderRoutes.patch(
    '/:id/status',
    authMiddleware,
    requirePermission('lab_orders:update'),
    async (req, res, next) => {
        try {
            await controller.updateLabOrderStatus(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labOrderRoutes.put(
    '/:id/results',
    authMiddleware,
    requirePermission('lab_results:enter'),
    async (req, res, next) => {
        try {
            await controller.enterLabOrderResults(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labOrderRoutes.post(
    '/:id/review',
    authMiddleware,
    requirePermission('lab_results:review'),
    async (req, res, next) => {
        try {
            await controller.reviewLabOrder(req, res);
        } catch (error) {
            next(error);
        }
    },
);

labOrderRoutes.post(
    '/:id/trigger-ai',
    authMiddleware,
    requirePermission('lab_results:review'),
    async (req, res, next) => {
        try {
            await controller.triggerLabOrderAi(req, res);
        } catch (error) {
            next(error);
        }
    },
);
