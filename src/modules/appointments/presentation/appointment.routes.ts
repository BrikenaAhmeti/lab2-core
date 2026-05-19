import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { AppointmentController } from './appointment.controller';

const controller = new AppointmentController();

export const appointmentRoutes = Router();

appointmentRoutes.post(
    '/',
    authMiddleware,
    requirePermission('appointments:create'),
    async (req, res, next) => {
        try {
            await controller.create(req, res);
        } catch (error) {
            next(error);
        }
    },
);

appointmentRoutes.get(
    '/',
    authMiddleware,
    requirePermission('appointments:read'),
    async (req, res, next) => {
        try {
            await controller.list(req, res);
        } catch (error) {
            next(error);
        }
    },
);

appointmentRoutes.get(
    '/today',
    authMiddleware,
    requirePermission('appointments:read'),
    async (req, res, next) => {
        try {
            await controller.today(req, res);
        } catch (error) {
            next(error);
        }
    },
);

appointmentRoutes.get(
    '/:id',
    authMiddleware,
    requirePermission('appointments:read'),
    async (req, res, next) => {
        try {
            await controller.getById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

appointmentRoutes.put(
    '/:id',
    authMiddleware,
    requirePermission('appointments:update'),
    async (req, res, next) => {
        try {
            await controller.reschedule(req, res);
        } catch (error) {
            next(error);
        }
    },
);

appointmentRoutes.patch(
    '/:id',
    authMiddleware,
    requirePermission('appointments:update'),
    async (req, res, next) => {
        try {
            await controller.reschedule(req, res);
        } catch (error) {
            next(error);
        }
    },
);

appointmentRoutes.patch(
    '/:id/status',
    authMiddleware,
    requirePermission('appointments:update'),
    async (req, res, next) => {
        try {
            await controller.updateStatus(req, res);
        } catch (error) {
            next(error);
        }
    },
);
