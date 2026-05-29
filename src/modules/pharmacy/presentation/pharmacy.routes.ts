import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { PharmacyController } from './pharmacy.controller';

const controller = new PharmacyController();

export const pharmacyRoutes = Router();

pharmacyRoutes.get(
    '/queue',
    authMiddleware,
    requirePermission('pharmacy:read'),
    async (req, res, next) => {
        try {
            await controller.listQueue(req, res);
        } catch (error) {
            next(error);
        }
    },
);

pharmacyRoutes.get(
    '/queue/:id',
    authMiddleware,
    requirePermission('pharmacy:read'),
    async (req, res, next) => {
        try {
            await controller.getQueueById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

pharmacyRoutes.patch(
    '/queue/:id/start',
    authMiddleware,
    requirePermission('pharmacy:dispense'),
    async (req, res, next) => {
        try {
            await controller.startQueue(req, res);
        } catch (error) {
            next(error);
        }
    },
);

pharmacyRoutes.post(
    '/queue/:id/dispense',
    authMiddleware,
    requirePermission('pharmacy:dispense'),
    async (req, res, next) => {
        try {
            await controller.dispenseQueue(req, res);
        } catch (error) {
            next(error);
        }
    },
);

pharmacyRoutes.patch(
    '/queue/:id/fulfill',
    authMiddleware,
    requirePermission('pharmacy:dispense'),
    async (req, res, next) => {
        try {
            await controller.fulfillQueue(req, res);
        } catch (error) {
            next(error);
        }
    },
);
