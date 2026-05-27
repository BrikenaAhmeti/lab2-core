import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { DashboardController } from './dashboard.controller';

const controller = new DashboardController();

export const dashboardRoutes = Router();

/**
 * @openapi
 * /api/dashboard/stats:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get dashboard summary statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics for the current day and recent revenue periods.
 */
dashboardRoutes.get(
    '/stats',
    authMiddleware,
    requirePermission('dashboard:read', 'all'),
    async (req, res, next) => {
        try {
            await controller.stats(req, res);
        } catch (error) {
            next(error);
        }
    },
);
