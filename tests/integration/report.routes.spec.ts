import jwt from 'jsonwebtoken';
import request from 'supertest';
import { ReportResult } from '../../src/modules/reports/domain/reports.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'report-routes-test-secret';
process.env.FRONTEND_ORIGINS = '';
process.env.MONGODB_URI = '';

const { createApp } = require('../../src/app');
const {
    ReportsPrismaRepository,
} = require('../../src/modules/reports/infrastructure/reports.prisma.repository');
const {
    MongoReportTemplateRepository,
} = require('../../src/modules/reports/infrastructure/report-template.mongo.repository');
const {
    ReportExportService,
} = require('../../src/modules/reports/services/report-export.service');

const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';

const appointmentReport: ReportResult = {
    type: 'appointments',
    title: 'Appointment Report',
    generatedAt: new Date('2026-05-29T10:00:00.000Z'),
    groupBy: 'department',
    filters: {
        from: '2026-05-01T00:00:00.000Z',
        to: '2026-05-29T00:00:00.000Z',
        departmentId: null,
        staffProfileId: null,
        serviceCatalogId: null,
        status: 'COMPLETED',
    },
    summary: [{ label: 'Total appointments', value: 2 }],
    rows: [
        {
            group: 'Cardiology',
            appointments: 2,
            completed: 2,
            cancelled: 0,
            noShow: 0,
        },
    ],
};

function createAccessToken(permissions: string[]) {
    return jwt.sign(
        {
            sub: actorUserId,
            email: 'reports@medsphere.local',
            roles: ['Admin'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Report routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('returns an appointment report with filters', async () => {
        const reportSpy = jest
            .spyOn(ReportsPrismaRepository.prototype, 'getAppointmentReport')
            .mockResolvedValue(appointmentReport);

        const response = await request(app)
            .get('/api/reports/appointments')
            .query({
                from: '2026-05-01',
                to: '2026-05-29',
                groupBy: 'department',
                status: 'COMPLETED',
            })
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['reports:generate'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.type).toBe('appointments');
        expect(response.body.rows).toHaveLength(1);
        expect(reportSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                groupBy: 'department',
                status: 'COMPLETED',
                from: expect.any(Date),
                to: expect.any(Date),
            }),
        );
    });

    it('exports a report when an export format is requested', async () => {
        jest.spyOn(
            ReportsPrismaRepository.prototype,
            'getFinancialReport',
        ).mockResolvedValue({
            ...appointmentReport,
            type: 'financial',
            title: 'Financial Report',
            groupBy: 'day',
        });
        const exportSpy = jest
            .spyOn(ReportExportService.prototype, 'export')
            .mockResolvedValue({
                buffer: Buffer.from('group,total\nCardiology,100\n'),
                contentType: 'text/csv',
                filename: 'financial-report-2026-05-29.csv',
            });

        const response = await request(app)
            .get('/api/reports/financial?export=csv')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['reports:generate'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain(
            'financial-report-2026-05-29.csv',
        );
        expect(exportSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'financial' }),
            'csv',
        );
    });

    it('saves a report template with the authenticated user id', async () => {
        const saveSpy = jest
            .spyOn(MongoReportTemplateRepository.prototype, 'saveTemplate')
            .mockResolvedValue({
                id: '68161b75c0834e2ec5d2b914',
                name: 'Monthly revenue',
                description: 'Finance template',
                reportType: 'financial',
                parameters: { groupBy: 'month' },
                createdBy: actorUserId,
                createdAt: new Date('2026-05-29T10:00:00.000Z'),
                updatedAt: new Date('2026-05-29T10:00:00.000Z'),
            });

        const response = await request(app)
            .post('/api/reports/templates')
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['reports:generate'])}`,
            )
            .send({
                name: 'Monthly revenue',
                description: 'Finance template',
                reportType: 'financial',
                parameters: { groupBy: 'month' },
            });

        expect(response.status).toBe(201);
        expect(response.body.reportType).toBe('financial');
        expect(saveSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                reportType: 'financial',
                createdBy: actorUserId,
            }),
        );
    });

    it('requires report generation permission', async () => {
        const response = await request(app)
            .get('/api/reports/patients')
            .set('Authorization', `Bearer ${createAccessToken(['patients:read'])}`);

        expect(response.status).toBe(403);
    });
});
