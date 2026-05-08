import { Router } from 'express';
import { ServiceCatalogController } from './service-catalog.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';

const controller = new ServiceCatalogController();

export const serviceCatalogRoutes = Router();

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
