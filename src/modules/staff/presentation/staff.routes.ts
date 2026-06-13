import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import {
    publicStaffScheduleRoutes,
    staffScheduleRoutes,
} from '../../schedules/presentation/schedule.routes';
import { StaffController } from './staff.controller';

const controller = new StaffController();

export const staffRoutes = Router();
export const publicStaffRoutes = Router();

publicStaffRoutes.get('/', async (req, res, next) => {
    try {
        await controller.listPublic(req, res);
    } catch (error) {
        next(error);
    }
});

publicStaffRoutes.use('/:id', publicStaffScheduleRoutes);

staffRoutes.get('/public', async (req, res, next) => {
    try {
        await controller.listPublic(req, res);
    } catch (error) {
        next(error);
    }
});

staffRoutes.get('/doctors', async (req, res, next) => {
    try {
        await controller.listDoctors(req, res);
    } catch (error) {
        next(error);
    }
});

staffRoutes.get('/doctors/:doctorId/available-slots', async (req, res, next) => {
    try {
        await controller.getDoctorAvailableSlots(req, res);
    } catch (error) {
        next(error);
    }
});

staffRoutes.get('/me', authMiddleware, async (req, res, next) => {
    try {
        await controller.me(req, res);
    } catch (error) {
        next(error);
    }
});

staffRoutes.get(
    '/',
    authMiddleware,
    requirePermission('staff:read'),
    async (req, res, next) => {
        try {
            await controller.list(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffRoutes.post(
    '/',
    authMiddleware,
    requirePermission('staff:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.create(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffRoutes.use('/:id', staffScheduleRoutes);

staffRoutes.get(
    '/:id',
    authMiddleware,
    requirePermission('staff:read'),
    async (req, res, next) => {
        try {
            await controller.getById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffRoutes.put(
    '/:id',
    authMiddleware,
    requirePermission('staff:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.update(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffRoutes.delete(
    '/:id',
    authMiddleware,
    requirePermission('staff:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.deactivate(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffRoutes.post(
    '/:id/departments',
    authMiddleware,
    requirePermission('staff:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.addDepartment(req, res);
        } catch (error) {
            next(error);
        }
    },
);

staffRoutes.delete(
    '/:id/departments',
    authMiddleware,
    requirePermission('staff:manage', 'all'),
    async (req, res, next) => {
        try {
            await controller.removeDepartment(req, res);
        } catch (error) {
            next(error);
        }
    },
);

export const departmentStaffRoutes = Router({ mergeParams: true });

departmentStaffRoutes.get(
    '/',
    authMiddleware,
    requirePermission('staff:read'),
    async (req, res, next) => {
        try {
            await controller.listByDepartment(req, res);
        } catch (error) {
            next(error);
        }
    },
);
