import { Router } from 'express';
import { DepartmentController } from './department.controller';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';

const controller = new DepartmentController();

export const departmentRoutes = Router();

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
