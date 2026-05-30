import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { InventoryController } from './inventory.controller';

const controller = new InventoryController();

export const inventoryRoutes = Router();

inventoryRoutes.get(
    '/alerts',
    authMiddleware,
    requirePermission('inventory:read'),
    async (req, res, next) => {
        try {
            await controller.getAlerts(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.post(
    '/categories',
    authMiddleware,
    requirePermission('inventory:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.createCategory(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.get(
    '/categories',
    authMiddleware,
    requirePermission('inventory:read'),
    async (req, res, next) => {
        try {
            await controller.listCategories(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.get(
    '/categories/:id',
    authMiddleware,
    requirePermission('inventory:read'),
    async (req, res, next) => {
        try {
            await controller.getCategoryById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.put(
    '/categories/:id',
    authMiddleware,
    requirePermission('inventory:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.updateCategory(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.patch(
    '/categories/:id',
    authMiddleware,
    requirePermission('inventory:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.updateCategory(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.delete(
    '/categories/:id',
    authMiddleware,
    requirePermission('inventory:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.deactivateCategory(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.post(
    '/items',
    authMiddleware,
    requirePermission('inventory:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.createItem(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.get(
    '/items',
    authMiddleware,
    requirePermission('inventory:read'),
    async (req, res, next) => {
        try {
            await controller.listItems(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.get(
    '/items/:id',
    authMiddleware,
    requirePermission('inventory:read'),
    async (req, res, next) => {
        try {
            await controller.getItemById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.put(
    '/items/:id',
    authMiddleware,
    requirePermission('inventory:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.updateItem(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.patch(
    '/items/:id',
    authMiddleware,
    requirePermission('inventory:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.updateItem(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.delete(
    '/items/:id',
    authMiddleware,
    requirePermission('inventory:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.deactivateItem(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.post(
    '/items/:id/transactions',
    authMiddleware,
    requirePermission('inventory:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.recordTransaction(req, res);
        } catch (error) {
            next(error);
        }
    },
);

inventoryRoutes.get(
    '/items/:id/transactions',
    authMiddleware,
    requirePermission('inventory:read'),
    async (req, res, next) => {
        try {
            await controller.listTransactions(req, res);
        } catch (error) {
            next(error);
        }
    },
);
