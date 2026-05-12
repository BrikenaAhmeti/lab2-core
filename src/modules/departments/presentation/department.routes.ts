import { Router } from 'express';
import { DepartmentController } from './department.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';

const controller = new DepartmentController();

export const departmentRoutes = Router();

/**
 * @openapi
 * /api/departments:
 *   post:
 *     tags:
 *       - Departments
 *     summary: Create a department
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDepartmentRequest'
 *     responses:
 *       201:
 *         description: Department created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Department already exists
 */
departmentRoutes.post(
    '/',
    authMiddleware,
    requirePermission('departments:manage', 'all'),
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
 * /api/departments:
 *   get:
 *     tags:
 *       - Departments
 *     summary: List departments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, sortOrder, createdAt, updatedAt]
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated department list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepartmentListResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
departmentRoutes.get(
    '/',
    authMiddleware,
    requirePermission('departments:read'),
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
 * /api/departments/{id}:
 *   get:
 *     tags:
 *       - Departments
 *     summary: Get a department by id
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
 *         description: Department details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 */
departmentRoutes.get(
    '/:id',
    authMiddleware,
    requirePermission('departments:read'),
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
 * /api/departments/{id}:
 *   patch:
 *     tags:
 *       - Departments
 *     summary: Update a department
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
 *             $ref: '#/components/schemas/UpdateDepartmentRequest'
 *     responses:
 *       200:
 *         description: Department updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 *       409:
 *         description: Department already exists
 */
departmentRoutes.patch(
    '/:id',
    authMiddleware,
    requirePermission('departments:manage', 'all'),
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
 * /api/departments/{id}:
 *   delete:
 *     tags:
 *       - Departments
 *     summary: Deactivate a department
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
 *         description: Department deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Department'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 */
departmentRoutes.delete(
    '/:id',
    authMiddleware,
    requirePermission('departments:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.deactivate(req, res);
        } catch (error) {
            next(error);
        }
    },
);
