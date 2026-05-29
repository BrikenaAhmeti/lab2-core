import { NextFunction, Request, Response, Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { ReportsController } from './reports.controller';

const controller = new ReportsController();

export const reportsRoutes = Router();

const canGenerateReports = [
    authMiddleware,
    requirePermission('reports:generate'),
];

reportsRoutes.get(
    '/appointments',
    canGenerateReports,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.appointments(req, res);
        } catch (error) {
            next(error);
        }
    },
);

reportsRoutes.get(
    '/clinical',
    canGenerateReports,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.clinical(req, res);
        } catch (error) {
            next(error);
        }
    },
);

reportsRoutes.get(
    '/financial',
    canGenerateReports,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.financial(req, res);
        } catch (error) {
            next(error);
        }
    },
);

reportsRoutes.get(
    '/inventory',
    canGenerateReports,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.inventory(req, res);
        } catch (error) {
            next(error);
        }
    },
);

reportsRoutes.get(
    '/patients',
    canGenerateReports,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.patients(req, res);
        } catch (error) {
            next(error);
        }
    },
);

reportsRoutes.get(
    '/staff-workload',
    canGenerateReports,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.staffWorkload(req, res);
        } catch (error) {
            next(error);
        }
    },
);

reportsRoutes.get(
    '/templates',
    canGenerateReports,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.listTemplates(req, res);
        } catch (error) {
            next(error);
        }
    },
);

reportsRoutes.post(
    '/templates',
    canGenerateReports,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.saveTemplate(req, res);
        } catch (error) {
            next(error);
        }
    },
);
