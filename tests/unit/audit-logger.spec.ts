jest.mock('../../src/infrastructure/db/prisma', () => ({
    prisma: {
        auditLog: {
            create: jest.fn(),
        },
    },
}));

import { prisma } from '../../src/infrastructure/db/prisma';
import { auditLog } from '../../src/shared/middleware/audit-logger';

describe('auditLog', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates an append-only audit log entry with old and new values', async () => {
        (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

        await auditLog({
            action: 'update',
            entity: 'departments',
            entityId: 'department-1',
            oldValue: { name: 'Cardiology' },
            newValue: { name: 'Radiology' },
            userId: '6a31cbfe-7e3d-4dff-a5df-f066fdd0cbab',
            ip: '127.0.0.1',
            userAgent: 'jest',
            requestId: 'request-1',
        });

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: 'update',
                entityType: 'departments',
                entityId: 'department-1',
                performedByUserId: '6a31cbfe-7e3d-4dff-a5df-f066fdd0cbab',
                ipAddress: '127.0.0.1',
                userAgent: 'jest',
                oldValue: { name: 'Cardiology' },
                newValue: { name: 'Radiology' },
                requestId: 'request-1',
            }),
        });
    });
});
