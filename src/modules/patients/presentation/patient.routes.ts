import { Router } from 'express';
import { authMiddleware } from '../../../shared/middleware/auth.middleware';
import { requireInternalApiKey } from '../../../shared/middleware/internal-api-key';
import { requirePermission } from '../../../shared/middleware/require-permission';
import { PatientController } from './patient.controller';

const controller = new PatientController();

export const patientRoutes = Router();
export const internalPatientRoutes = Router();

internalPatientRoutes.post(
    '/link-by-personal-number',
    requireInternalApiKey,
    async (req, res, next) => {
        try {
            await controller.linkByPersonalNumber(req, res);
        } catch (error) {
            next(error);
        }
    },
);

internalPatientRoutes.get(
    '/by-user/:userId',
    requireInternalApiKey,
    async (req, res, next) => {
        try {
            await controller.getInternalByUserId(req, res);
        } catch (error) {
            next(error);
        }
    },
);

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

patientRoutes.post('/', async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const handler = async () => {
        try {
            if (req.user) {
                await controller.create(req, res);
            } else {
                await controller.publicCreate(req, res);
            }
        } catch (error) {
            next(error);
        }
    };

    if (authHeader?.startsWith('Bearer ')) {
        return authMiddleware(req, res, handler);
    }

    return handler();
});

patientRoutes.get('/me', authMiddleware, async (req, res, next) => {
    try {
        await controller.me(req, res);
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
