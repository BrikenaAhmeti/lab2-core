import { Router } from 'express';
import { ServiceCatalogController } from './service-catalog.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';

const controller = new ServiceCatalogController();

export const serviceCatalogRoutes = Router();
export const publicServiceCatalogRoutes = Router();

publicServiceCatalogRoutes.get('/', async (req, res, next) => {
    try {
        await controller.list(req, res);
    } catch (error) {
        next(error);
    }
});

/**
 * @openapi
 * /api/services:
 *   post:
 *     tags:
 *       - Service Catalog
 *     summary: Create a service catalog entry
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateServiceCatalogRequest'
 *     responses:
 *       201:
 *         description: Service created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceCatalog'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Department not found
 */
serviceCatalogRoutes.post(
    '/',
    authMiddleware,
    requirePermission('services:manage', 'all'),
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
 * /api/services:
 *   get:
 *     tags:
 *       - Service Catalog
 *     summary: List service catalog entries
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
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, sortOrder, defaultDurationMinutes, defaultPrice, createdAt, updatedAt]
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated service list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceCatalogListResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
serviceCatalogRoutes.get(
    '/',
    authMiddleware,
    requirePermission('services:read'),
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
 * /api/services/{id}:
 *   get:
 *     tags:
 *       - Service Catalog
 *     summary: Get a service catalog entry by id
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
 *         description: Service details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceCatalog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Service not found
 */
serviceCatalogRoutes.get(
    '/:id',
    authMiddleware,
    requirePermission('services:read'),
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
 * /api/services/{id}:
 *   patch:
 *     tags:
 *       - Service Catalog
 *     summary: Update a service catalog entry
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
 *             $ref: '#/components/schemas/UpdateServiceCatalogRequest'
 *     responses:
 *       200:
 *         description: Service updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceCatalog'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Service or department not found
 */
serviceCatalogRoutes.patch(
    '/:id',
    authMiddleware,
    requirePermission('services:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.update(req, res);
        } catch (error) {
            next(error);
        }
    },
);

serviceCatalogRoutes.put(
    '/:id',
    authMiddleware,
    requirePermission('services:manage', 'all'),
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
 * /api/services/{id}:
 *   delete:
 *     tags:
 *       - Service Catalog
 *     summary: Deactivate a service catalog entry
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
 *         description: Service deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceCatalog'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Service not found
 */
serviceCatalogRoutes.delete(
    '/:id',
    authMiddleware,
    requirePermission('services:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.deactivate(req, res);
        } catch (error) {
            next(error);
        }
    },
);
