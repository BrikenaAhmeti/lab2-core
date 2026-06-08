import express, { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { DataExchangeController } from './data-exchange.controller';

const controller = new DataExchangeController();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

export const dataExportRoutes = Router();
export const dataImportRoutes = Router();

const exportPermissions: Record<string, string[]> = {
    patients: ['patients:read'],
    appointments: ['appointments:read'],
    'lab-results': ['lab_orders:read', 'lab_results:read'],
    'inventory-items': ['inventory:read'],
    billings: ['billings:read'],
    'audit-logs': ['audit_logs:read'],
    staff: ['staff:read'],
};

const importPermissions: Record<string, string[]> = {
    patients: ['patients:manage', 'patients:create'],
    'inventory-items': ['inventory:manage'],
    'lab-tests': ['lab_tests:manage'],
    'service-catalog': ['services:manage'],
    staff: ['staff:manage'],
};

function hasPermission(req: Request, permission: string) {
    const permissions = req.user?.permissions ?? [];

    return (
        permissions.includes(permission) ||
        permissions.some((item) => item.startsWith(`${permission}:`))
    );
}

function requireAny(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (permissions.some((permission) => hasPermission(req, permission))) {
            return next();
        }

        return res.status(403).json({ message: 'Forbidden' });
    };
}

function requireEntityPermission(map: Record<string, string[]>) {
    return (req: Request, res: Response, next: NextFunction) => {
        const permissions = map[String(req.params.entity)] ?? [];

        return requireAny(permissions)(req, res, next);
    };
}

function requireAnyImportPermission(req: Request, res: Response, next: NextFunction) {
    return requireAny(Object.values(importPermissions).flat())(req, res, next);
}

dataExportRoutes.get(
    '/:entity',
    authMiddleware,
    requireEntityPermission(exportPermissions),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.export(req, res);
        } catch (error) {
            next(error);
        }
    },
);

dataImportRoutes.get(
    '/template/:entity',
    authMiddleware,
    requireEntityPermission(importPermissions),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.template(req, res);
        } catch (error) {
            next(error);
        }
    },
);

dataImportRoutes.get(
    '/jobs/:jobId',
    authMiddleware,
    requireAnyImportPermission,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.job(req, res);
        } catch (error) {
            next(error);
        }
    },
);

dataImportRoutes.post(
    '/:entity',
    authMiddleware,
    requireEntityPermission(importPermissions),
    upload.single('file'),
    express.raw({
        type: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/octet-stream',
        ],
        limit: '10mb',
    }),
    express.text({
        type: ['text/csv', 'text/plain', 'application/csv'],
        limit: '10mb',
    }),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await controller.import(req, res);
        } catch (error) {
            next(error);
        }
    },
);
