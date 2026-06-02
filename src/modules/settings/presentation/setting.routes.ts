import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { requireSuperAdmin } from '../../../shared/middleware/require-super-admin';
import { SettingController } from './setting.controller';

const controller = new SettingController();

export const settingRoutes = Router();
export const publicSettingRoutes = Router();

publicSettingRoutes.get('/', async (req, res, next) => {
    try {
        await controller.listPublic(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @openapi
 * /api/settings:
 *   get:
 *     tags:
 *       - Settings
 *     summary: Get platform settings grouped by category
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Grouped settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupedSettingsResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
settingRoutes.get(
    '/',
    authMiddleware,
    requirePermission('settings:read'),
    async (req, res, next) => {
        try {
            await controller.list(req, res);
        } catch (error) {
            next(error);
        }
    },
);

/**
 * @openapi
 * /api/settings/bulk:
 *   put:
 *     tags:
 *       - Settings
 *     summary: Update multiple settings at once
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdateSettingsRequest'
 *     responses:
 *       200:
 *         description: Updated settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkUpdateSettingsResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
settingRoutes.put(
    '/bulk',
    authMiddleware,
    requirePermission('settings:manage', 'all'),
    requireSuperAdmin,
    async (req, res, next) => {
        try {
            await controller.bulkUpdate(req, res);
        } catch (error) {
            next(error);
        }
    },
);

/**
 * @openapi
 * /api/settings/{key}:
 *   put:
 *     tags:
 *       - Settings
 *     summary: Update a single setting
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSettingRequest'
 *     responses:
 *       200:
 *         description: Updated setting
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupedSettingItem'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Setting not found
 */
settingRoutes.put(
    '/:key',
    authMiddleware,
    requirePermission('settings:manage', 'all'),
    requireSuperAdmin,
    async (req, res, next) => {
        try {
            await controller.update(req, res);
        } catch (error) {
            next(error);
        }
    },
);
