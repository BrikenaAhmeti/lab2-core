import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { MedicalRecordController } from './medical-record.controller';

const controller = new MedicalRecordController();

export const medicalRecordRoutes = Router();

medicalRecordRoutes.post(
    '/',
    authMiddleware,
    requirePermission('medical_records:write'),
    async (req, res, next) => {
        try {
            await controller.create(req, res);
        } catch (error) {
            next(error);
        }
    },
);

medicalRecordRoutes.get(
    '/',
    authMiddleware,
    requirePermission('medical_records:read'),
    async (req, res, next) => {
        try {
            await controller.list(req, res);
        } catch (error) {
            next(error);
        }
    },
);

medicalRecordRoutes.get(
    '/:id/pdf',
    authMiddleware,
    requirePermission('medical_records:read'),
    async (req, res, next) => {
        try {
            await controller.downloadPdf(req, res);
        } catch (error) {
            next(error);
        }
    },
);

medicalRecordRoutes.get(
    '/:id',
    authMiddleware,
    requirePermission('medical_records:read'),
    async (req, res, next) => {
        try {
            await controller.getById(req, res);
        } catch (error) {
            next(error);
        }
    },
);

medicalRecordRoutes.put(
    '/:id',
    authMiddleware,
    requirePermission('medical_records:write'),
    async (req, res, next) => {
        try {
            await controller.update(req, res);
        } catch (error) {
            next(error);
        }
    },
);

medicalRecordRoutes.patch(
    '/:id',
    authMiddleware,
    requirePermission('medical_records:write'),
    async (req, res, next) => {
        try {
            await controller.update(req, res);
        } catch (error) {
            next(error);
        }
    },
);

medicalRecordRoutes.post(
    '/:id/finalize',
    authMiddleware,
    requirePermission('medical_records:write'),
    async (req, res, next) => {
        try {
            await controller.finalize(req, res);
        } catch (error) {
            next(error);
        }
    },
);

medicalRecordRoutes.post(
    '/:id/amendments',
    authMiddleware,
    requirePermission('medical_records:write'),
    async (req, res, next) => {
        try {
            await controller.addAmendment(req, res);
        } catch (error) {
            next(error);
        }
    },
);
