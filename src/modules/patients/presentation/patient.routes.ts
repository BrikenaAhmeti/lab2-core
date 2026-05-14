import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { PatientController } from './patient.controller';

const controller = new PatientController();

export const patientRoutes = Router();

patientRoutes.get(
    '/',
    authMiddleware,
    requirePermission('patients:read'),
    async (req, res, next) => {
        try {
            await controller.list(req, res);
        } catch (error) {
            next(error);
        }
    },
);

patientRoutes.post('/', authMiddleware, async (req, res, next) => {
    try {
        await controller.create(req, res);
    } catch (error) {
        next(error);
    }
});

patientRoutes.get('/:id', authMiddleware, async (req, res, next) => {
    try {
        await controller.getById(req, res);
    } catch (error) {
        next(error);
    }
});

patientRoutes.put('/:id', authMiddleware, async (req, res, next) => {
    try {
        await controller.update(req, res);
    } catch (error) {
        next(error);
    }
});

patientRoutes.get('/:id/timeline', authMiddleware, async (req, res, next) => {
    try {
        await controller.timeline(req, res);
    } catch (error) {
        next(error);
    }
});
