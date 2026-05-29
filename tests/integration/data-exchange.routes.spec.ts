import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'data-exchange-routes-test-secret';
process.env.PATIENT_DATA_ENCRYPTION_KEY = 'data-exchange-routes-test-key';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    DataExchangePrismaRepository,
} = require('../../src/modules/data-exchange/infrastructure/data-exchange.prisma.repository');

const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';

function createAccessToken(permissions: string[]) {
    return jwt.sign(
        {
            sub: actorUserId,
            email: 'admin@medsphere.local',
            roles: ['Admin'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Data exchange routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('exports patients as CSV', async () => {
        const exportSpy = jest
            .spyOn(DataExchangePrismaRepository.prototype, 'exportRows')
            .mockResolvedValue([
                {
                    id: '6d8ad35f-76cc-4cf7-bc12-065ac46a3f7f',
                    userId: null,
                    firstName: 'Ada',
                    lastName: 'Lovelace',
                    email: 'ada@example.com',
                    isActive: true,
                    createdAt: new Date('2026-05-29T08:00:00.000Z'),
                    updatedAt: new Date('2026-05-29T08:00:00.000Z'),
                },
            ]);

        const response = await request(app)
            .get('/api/export/patients?format=csv')
            .set('Authorization', `Bearer ${createAccessToken(['patients:read'])}`);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('patients-');
        expect(response.text).toContain('firstName');
        expect(response.text).toContain('Ada');
        expect(exportSpy).toHaveBeenCalledWith('patients');
    });

    it('imports patients from a multipart CSV in lenient mode', async () => {
        jest.spyOn(
            DataExchangePrismaRepository.prototype,
            'findExistingPatientKeys',
        ).mockResolvedValue({
            emails: new Set(),
            personalNumberHashes: new Set(),
            userIds: new Set(),
        });
        const importSpy = jest
            .spyOn(DataExchangePrismaRepository.prototype, 'importPatients')
            .mockResolvedValue(1);

        const response = await request(app)
            .post('/api/import/patients')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['patients:manage:all'])}`,
            )
            .field('mode', 'lenient')
            .attach(
                'file',
                Buffer.from(
                    'firstName,lastName,email,personalNumber\nAda,Lovelace,ada@example.com,1234567890\n',
                ),
                {
                    filename: 'patients.csv',
                    contentType: 'text/csv',
                },
            );

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
            expect.objectContaining({
                entity: 'patients',
                mode: 'lenient',
                totalRows: 1,
                importedRows: 1,
                skippedRows: 0,
                errors: [],
            }),
        );
        expect(importSpy).toHaveBeenCalledWith(
            [
                expect.objectContaining({
                    firstName: 'Ada',
                    lastName: 'Lovelace',
                    email: 'ada@example.com',
                    personalNumber: expect.stringMatching(/^enc:/),
                    personalNumberHash: expect.any(String),
                }),
            ],
            actorUserId,
            false,
        );
    });

    it('reports duplicate patient rows in strict mode without importing', async () => {
        jest.spyOn(
            DataExchangePrismaRepository.prototype,
            'findExistingPatientKeys',
        ).mockResolvedValue({
            emails: new Set(['ada@example.com']),
            personalNumberHashes: new Set(),
            userIds: new Set(),
        });
        const importSpy = jest.spyOn(
            DataExchangePrismaRepository.prototype,
            'importPatients',
        );

        const response = await request(app)
            .post('/api/import/patients?mode=strict')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['patients:manage:all'])}`,
            )
            .send({
                rows: [
                    {
                        firstName: 'Ada',
                        lastName: 'Lovelace',
                        email: 'ada@example.com',
                    },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.importedRows).toBe(0);
        expect(response.body.skippedRows).toBe(1);
        expect(response.body.errors).toEqual([
            expect.objectContaining({
                row: 1,
                field: 'email',
                reason: 'email already exists',
            }),
        ]);
        expect(importSpy).not.toHaveBeenCalled();
    });

    it('downloads a lab test import template', async () => {
        const response = await request(app)
            .get('/api/import/template/lab-tests?format=csv')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['lab_tests:manage:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('code');
        expect(response.text).toContain('Complete Blood Count');
    });

    it('protects inventory exports with inventory permissions', async () => {
        const response = await request(app)
            .get('/api/export/inventory-items')
            .set('Authorization', `Bearer ${createAccessToken(['patients:read'])}`);

        expect(response.status).toBe(403);
    });
});
