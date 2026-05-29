import { ReportResult } from '../../src/modules/reports/domain/reports.entity';
import {
    ReportsRepository,
    ReportTemplateRepository,
} from '../../src/modules/reports/domain/reports.repository';
import { ReportService } from '../../src/modules/reports/services/report.service';

const report: ReportResult = {
    type: 'appointments',
    title: 'Appointment Report',
    generatedAt: new Date('2026-05-29T10:00:00.000Z'),
    groupBy: 'status',
    filters: {
        from: null,
        to: null,
        departmentId: null,
        staffProfileId: null,
        serviceCatalogId: null,
        status: null,
    },
    summary: [{ label: 'Total appointments', value: 1 }],
    rows: [{ group: 'COMPLETED', appointments: 1 }],
};

function createReportsRepositoryMock(): jest.Mocked<ReportsRepository> {
    return {
        getAppointmentReport: jest.fn(),
        getClinicalReport: jest.fn(),
        getFinancialReport: jest.fn(),
        getInventoryReport: jest.fn(),
        getPatientsReport: jest.fn(),
        getStaffWorkloadReport: jest.fn(),
    };
}

function createTemplateRepositoryMock(): jest.Mocked<ReportTemplateRepository> {
    return {
        saveTemplate: jest.fn(),
        listTemplates: jest.fn(),
    };
}

describe('ReportService', () => {
    it('normalizes the default grouping before querying appointments', async () => {
        const reportsRepository = createReportsRepositoryMock();
        const templateRepository = createTemplateRepositoryMock();
        reportsRepository.getAppointmentReport.mockResolvedValue(report);
        const service = new ReportService(reportsRepository, templateRepository);

        const result = await service.getAppointmentReport({});

        expect(result).toBe(report);
        expect(reportsRepository.getAppointmentReport).toHaveBeenCalledWith(
            expect.objectContaining({
                groupBy: 'status',
            }),
        );
    });

    it('rejects unsupported groupings for a report type', async () => {
        const service = new ReportService(
            createReportsRepositoryMock(),
            createTemplateRepositoryMock(),
        );

        await expect(
            service.getFinancialReport({ groupBy: 'bloodType' }),
        ).rejects.toMatchObject({
            message: 'Unsupported groupBy for financial report',
            statusCode: 400,
        });
    });

    it('rejects inverted date ranges', async () => {
        const service = new ReportService(
            createReportsRepositoryMock(),
            createTemplateRepositoryMock(),
        );

        await expect(
            service.getInventoryReport({
                from: new Date('2026-05-30T00:00:00.000Z'),
                to: new Date('2026-05-01T00:00:00.000Z'),
            }),
        ).rejects.toMatchObject({
            message: 'from must be before or equal to to',
            statusCode: 400,
        });
    });

    it('trims saved report templates before persistence', async () => {
        const reportsRepository = createReportsRepositoryMock();
        const templateRepository = createTemplateRepositoryMock();
        templateRepository.saveTemplate.mockResolvedValue({
            id: '68161b75c0834e2ec5d2b914',
            name: 'Revenue',
            description: 'Monthly',
            reportType: 'financial',
            parameters: { groupBy: 'month' },
            createdBy: '7cded68b-2455-4104-87ea-cc3b78d2aa6f',
            createdAt: new Date('2026-05-29T10:00:00.000Z'),
            updatedAt: new Date('2026-05-29T10:00:00.000Z'),
        });
        const service = new ReportService(reportsRepository, templateRepository);

        await service.saveTemplate({
            name: ' Revenue ',
            description: ' Monthly ',
            reportType: 'financial',
            parameters: { groupBy: 'month' },
            createdBy: '7cded68b-2455-4104-87ea-cc3b78d2aa6f',
        });

        expect(templateRepository.saveTemplate).toHaveBeenCalledWith({
            name: 'Revenue',
            description: 'Monthly',
            reportType: 'financial',
            parameters: { groupBy: 'month' },
            createdBy: '7cded68b-2455-4104-87ea-cc3b78d2aa6f',
        });
    });
});
