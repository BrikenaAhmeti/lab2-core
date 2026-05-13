import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { StaffPositionTypeController } from './staff-position-type.controller';

const controller = new StaffPositionTypeController();

export const staffPositionTypeRoutes = Router();

/**
 * @openapi
 * /api/staff-position-types:
 *   post:
 *     tags:
 *       - Staff Position Types
 *     summary: Create a staff position type
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStaffPositionTypeRequest'
 *     responses:
 *       201:
 *         description: Staff position type created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffPositionType'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Staff position type already exists
 */
staffPositionTypeRoutes.post(
    '/',
    authMiddleware,
    requirePermission('staff-types:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.create(req, res);
        } catch (error) {
            next(error);
        }
    },
);

/**
 * @openapi
 * /api/staff-position-types:
 *   get:
 *     tags:
 *       - Staff Position Types
 *     summary: List staff position types
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Staff position type list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffPositionTypeListResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
staffPositionTypeRoutes.get(
    '/',
    authMiddleware,
    requirePermission('staff-types:read'),
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
 * /api/staff-position-types/{id}:
 *   get:
 *     tags:
 *       - Staff Position Types
 *     summary: Get a staff position type by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff position type details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffPositionType'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff position type not found
 */
staffPositionTypeRoutes.get(
    '/:id',
    authMiddleware,
    requirePermission('staff-types:read'),
    async (req, res, next) => {
        try {
            await controller.getById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

/**
 * @openapi
 * /api/staff-position-types/{id}:
 *   put:
 *     tags:
 *       - Staff Position Types
 *     summary: Update a staff position type
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStaffPositionTypeRequest'
 *     responses:
 *       200:
 *         description: Staff position type updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffPositionType'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff position type not found
 *       409:
 *         description: Staff position type already exists
 */
staffPositionTypeRoutes.put(
    '/:id',
    authMiddleware,
    requirePermission('staff-types:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.update(req, res);
        } catch (error) {
            next(error);
        }
    },
);

/**
 * @openapi
 * /api/staff-position-types/{id}:
 *   delete:
 *     tags:
 *       - Staff Position Types
 *     summary: Deactivate a staff position type
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staff position type deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StaffPositionType'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff position type not found
 *       409:
 *         description: Staff is assigned to this position type
 */
staffPositionTypeRoutes.delete(
    '/:id',
    authMiddleware,
    requirePermission('staff-types:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.deactivate(req, res);
        } catch (error) {
            next(error);
        }
    },
);
