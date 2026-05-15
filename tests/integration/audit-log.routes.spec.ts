import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'audit-log-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    AuditLogPrismaRepository,
} = require('../../src/modules/audit-logs/infrastructure/audit-log.prisma.repository');

function createAccessToken(roles: string[] = ['Super Admin']) {
    return jwt.sign(
        {
            sub: '6a31cbfe-7e3d-4dff-a5df-f066fdd0cbab',
            email: 'super@medsphere.local',
            roles,
            permissions: [],
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

const auditLog = {
    id: 'audit-1',
    action: 'update',
    entityType: 'departments',
    entityId: 'department-1',
    performedByUserId: '6a31cbfe-7e3d-4dff-a5df-f066fdd0cbab',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    oldValue: { name: 'Cardiology' },
    newValue: { name: 'Radiology' },
    requestId: 'request-1',
    metadata: { path: '/api/departments/department-1' },
    createdAt: new Date('2026-05-15T10:00:00.000Z'),
};

describe('Audit log routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('lists audit logs for super admins with filters', async () => {
        const listSpy = jest
            .spyOn(AuditLogPrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [auditLog],
                meta: {
                    page: 1,
                    limit: 25,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get('/api/audit-logs?action=update&entity=departments&ip=127.0.0.1')
            .set('Authorization', `Bearer ${createAccessToken()}`);

        expect(response.status).toBe(200);
        expect(response.body.items[0]).toMatchObject({
            action: 'update',
            entity: 'departments',
            entityId: 'department-1',
            userId: '6a31cbfe-7e3d-4dff-a5df-f066fdd0cbab',
            oldValue: { name: 'Cardiology' },
            newValue: { name: 'Radiology' },
        });
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'update',
                entity: 'departments',
                ip: '127.0.0.1',
            }),
        );
    });

    it('exports audit logs as csv for super admins', async () => {
        jest.spyOn(AuditLogPrismaRepository.prototype, 'export').mockResolvedValue([
            auditLog,
        ]);

        const response = await request(app)
            .get('/api/audit-logs/export?format=csv')
            .set('Authorization', `Bearer ${createAccessToken()}`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('id,timestamp,action,entity');
        expect(response.text).toContain('departments');
    });

    it('rejects non-super-admin users', async () => {
        const response = await request(app)
            .get('/api/audit-logs')
            .set('Authorization', `Bearer ${createAccessToken(['Admin'])}`);

        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Super Admin access required');
    });
});
