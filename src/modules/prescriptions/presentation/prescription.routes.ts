import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { PrescriptionController } from './prescription.controller';

const controller = new PrescriptionController();

export const prescriptionRoutes = Router();

prescriptionRoutes.post(
    '/',
    authMiddleware,
    requirePermission('prescriptions:write'),
    async (req, res, next) => {
        try {
            await controller.create(req, res);
        } catch (error) {
            next(error);
        }
    },
);

prescriptionRoutes.get(
    '/',
    authMiddleware,
    requirePermission('prescriptions:read'),
    async (req, res, next) => {
        try {
            await controller.list(req, res);
        } catch (error) {
            next(error);
        }
    },
);

prescriptionRoutes.get(
    '/:id/pdf',
    authMiddleware,
    requirePermission('prescriptions:read'),
    async (req, res, next) => {
        try {
            await controller.downloadPdf(req, res);
        } catch (error) {
            next(error);
        }
    },
);

prescriptionRoutes.get(
    '/:id',
    authMiddleware,
    requirePermission('prescriptions:read'),
    async (req, res, next) => {
        try {
            await controller.getById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

prescriptionRoutes.post(
    '/:id/void',
    authMiddleware,
    requirePermission('prescriptions:write'),
    async (req, res, next) => {
        try {
            await controller.voidPrescription(req, res);
        } catch (error) {
            next(error);
        }
    },
);
