import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { ScheduleController } from './schedule.controller';

const controller = new ScheduleController();

export const staffScheduleRoutes = Router({ mergeParams: true });

staffScheduleRoutes.get(
    '/schedules',
    authMiddleware,
    requirePermission('staff:read'),
    async (req, res, next) => {
        try {
            await controller.getWeeklySchedule(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffScheduleRoutes.put(
    '/schedules',
    authMiddleware,
    requirePermission('staff:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.upsertWeeklySchedule(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffScheduleRoutes.get(
    '/schedule-exceptions',
    authMiddleware,
    requirePermission('staff:read'),
    async (req, res, next) => {
        try {
            await controller.listExceptions(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffScheduleRoutes.post(
    '/schedule-exceptions',
    authMiddleware,
    requirePermission('staff:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.createException(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffScheduleRoutes.delete(
    '/schedule-exceptions',
    authMiddleware,
    requirePermission('staff:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.deleteException(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffScheduleRoutes.delete(
    '/schedule-exceptions/:exceptionId',
    authMiddleware,
    requirePermission('staff:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.deleteException(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffScheduleRoutes.get(
    '/available-slots',
    authMiddleware,
    requirePermission('staff:read'),
    async (req, res, next) => {
        try {
            await controller.getAvailableSlots(req, res);
        } catch (error) {
            next(error);
        }
    },
);
