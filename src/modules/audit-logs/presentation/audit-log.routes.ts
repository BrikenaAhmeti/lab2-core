import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requireSuperAdmin } from '../../../shared/middleware/require-super-admin';
import { AuditLogController } from './audit-log.controller';

const controller = new AuditLogController();

export const auditLogRoutes = Router();

/**
 * @openapi
 * /api/audit-logs:
 *   get:
 *     tags:
 *       - Audit Logs
 *     summary: List audit logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: ip
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Super Admin access required
 */
auditLogRoutes.get('/', authMiddleware, requireSuperAdmin, async (req, res, next) => {
    try {
        await controller.list(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @openapi
 * /api/audit-logs/export:
 *   get:
 *     tags:
 *       - Audit Logs
 *     summary: Export audit logs as CSV
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv]
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: ip
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: CSV audit log export
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Super Admin access required
 */
auditLogRoutes.get('/export', authMiddleware, requireSuperAdmin, async (req, res, next) => {
    try {
        await controller.export(req, res);
    } catch (error) {
        next(error);
    }
});
