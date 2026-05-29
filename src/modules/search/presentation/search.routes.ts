import { NextFunction, Request, Response, Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { SearchController } from './search.controller';

const controller = new SearchController();

export const searchRoutes = Router();

searchRoutes.get(
    '/patients',
    authMiddleware,
    requirePermission('patients:read'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.patients(req, res);
        } catch (error) {
            next(error);
        }
    },
);

searchRoutes.get(
    '/appointments',
    authMiddleware,
    requirePermission('appointments:read'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.appointments(req, res);
        } catch (error) {
            next(error);
        }
    },
);

searchRoutes.get(
    '/lab-orders',
    authMiddleware,
    requirePermission('lab_orders:read'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.labOrders(req, res);
        } catch (error) {
            next(error);
        }
    },
);

searchRoutes.get(
    '/inventory-items',
    authMiddleware,
    requirePermission('inventory:read'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.inventoryItems(req, res);
        } catch (error) {
            next(error);
        }
    },
);

searchRoutes.get(
    '/staff',
    authMiddleware,
    requirePermission('staff:read'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.staff(req, res);
        } catch (error) {
            next(error);
        }
    },
);

searchRoutes.get(
    '/audit-logs',
    authMiddleware,
    requirePermission('audit_logs:read'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.auditLogs(req, res);
        } catch (error) {
            next(error);
        }
    },
);
