import { Router } from 'express';
import { NextFunction, Request, Response } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { DashboardController } from './dashboard.controller';

const controller = new DashboardController();

export const dashboardRoutes = Router();

const ADMIN_ROLE_ALIASES = new Set(['admin', 'super admin', 'super_admin', 'superadmin']);
const requireDashboardAccessByPermission = requirePermission('dashboard:read', 'all');

function normalizeRole(role: string) {
    return role.trim().toLowerCase();
}

function requireDashboardAccess(req: Request, res: Response, next: NextFunction) {
    const hasAdminRole = (req.user?.roles ?? []).some((role) =>
        ADMIN_ROLE_ALIASES.has(normalizeRole(role)),
    );

    if (hasAdminRole) {
        return next();
    }

    return requireDashboardAccessByPermission(req, res, next);
}

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
    requireDashboardAccess,
    async (req, res, next) => {
        try {
            await controller.stats(req, res);
        } catch (error) {
            next(error);
        }
    },
);
