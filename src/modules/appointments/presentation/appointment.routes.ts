import { NextFunction, Request, Response, Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requireInternalApiKey } from '../../../shared/middleware/internal-api-key';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { AppointmentController } from './appointment.controller';
import { VapiToolsController } from './vapi-tools.controller';

const controller = new AppointmentController();
const vapiToolsController = new VapiToolsController();

export const appointmentRoutes = Router();
export const internalAppointmentRoutes = Router();
export const publicAppointmentRoutes = Router();

function hasPermission(req: Request, permission: string) {
    const permissions = req.user?.permissions ?? [];

    return (
        permissions.includes(permission) ||
        permissions.some((item) => item.startsWith(`${permission}:`))
    );
}

function requireAnyPermission(permissions: string[]) {
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

internalAppointmentRoutes.get(
    '/reminders',
    requireInternalApiKey,
    async (req, res, next) => {
        try {
            await controller.reminderCandidates(req, res);
        } catch (error) {
            next(error);
        }
    },
);

internalAppointmentRoutes.get(
    '/:id/ai-clinical-context',
    requireInternalApiKey,
    async (req, res, next) => {
        try {
            await controller.aiClinicalContext(req, res);
        } catch (error) {
            next(error);
        }
    },
);

internalAppointmentRoutes.post(
    '/vapi/tools',
    requireInternalApiKey,
    async (req, res, next) => {
        try {
            await vapiToolsController.handle(req, res);
        } catch (error) {
            next(error);
        }
    },
);

publicAppointmentRoutes.post('/', async (req, res, next) => {
    try {
        await controller.publicCreate(req, res);
    } catch (error) {
        next(error);
    }
});

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
    requireAnyPermission(['appointments:update', 'appointments:cancel']),
    async (req, res, next) => {
        try {
            await controller.updateStatus(req, res);
        } catch (error) {
            next(error);
        }
    },
);
