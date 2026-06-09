jest.mock('../../src/infrastructure/db/prisma', () => ({
    prisma: {
        auditLog: {
            create: jest.fn(),
        },
    },
}));

import { prisma } from '../../src/infrastructure/db/prisma';
import {
    auditLog,
    inferAuditDetails,
} from '../../src/shared/middleware/audit-logger';

function mockRequest(method: string, path: string, body: unknown = {}, query = {}) {
    return {
        method,
        path,
        params: {},
        body,
        query,
    } as never;
}

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
            newValue: {
                name: 'Radiology',
                personalNumber: 'PN-123',
            },
            userId: '6a31cbfe-7e3d-4dff-a5df-f066fdd0cbab',
            ip: '127.0.0.1',
            userAgent: 'jest',
            requestId: 'request-1',
            metadata: {
                apiToken: 'secret-token',
            },
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
                newValue: {
                    name: 'Radiology',
                    personalNumber: '[REDACTED]',
                },
                requestId: 'request-1',
                metadata: {
                    apiToken: '[REDACTED]',
                },
            }),
        });
    });

    it('infers route-specific audit details for appointment status changes', () => {
        const details = inferAuditDetails(
            mockRequest('PATCH', '/api/appointments/appointment-1/status', {
                status: 'COMPLETED',
            }),
            { id: 'appointment-1' },
        );

        expect(details).toMatchObject({
            action: 'appointments.status_updated',
            entity: 'appointments',
            entityId: 'appointment-1',
            metadata: {
                nextStatus: 'COMPLETED',
            },
        });
    });

    it('infers nested inventory transaction logs', () => {
        const details = inferAuditDetails(
            mockRequest('POST', '/api/inventory/items/item-1/transactions'),
            { id: 'transaction-1' },
        );

        expect(details).toMatchObject({
            action: 'inventory.transactions.recorded',
            entity: 'inventory-transactions',
            entityId: 'transaction-1',
            metadata: {
                inventoryItemId: 'item-1',
            },
        });
    });

    it('marks internal patient link actions distinctly', () => {
        const details = inferAuditDetails(
            mockRequest('POST', '/internal/patients/link-by-personal-number', {
                userId: 'user-1',
            }),
            { id: 'patient-1' },
        );

        expect(details).toMatchObject({
            action: 'patients.linked_by_personal_number',
            entity: 'patients',
            entityId: 'patient-1',
            metadata: {
                internal: true,
            },
        });
    });

    it('does not infer audit details for read-only requests', () => {
        expect(
            inferAuditDetails(mockRequest('GET', '/api/departments'), undefined),
        ).toBeNull();
    });
});
