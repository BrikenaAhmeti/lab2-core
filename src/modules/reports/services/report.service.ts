import { AppError } from '../../../shared/core/errors/app-error';
import {
    ReportFilters,
    ReportResult,
    ReportTemplate,
    ReportType,
    SaveReportTemplateData,
} from '../domain/reports.entity';
import {
    ReportsRepository,
    ReportTemplateRepository,
} from '../domain/reports.repository';

const allowedGroupings: Record<ReportType, string[]> = {
    appointments: ['status', 'department', 'doctor', 'service', 'day', 'hour'],
    clinical: ['category', 'department', 'doctor', 'labTest', 'medication', 'diagnosis', 'day'],
    financial: ['day', 'month', 'department', 'service', 'doctor', 'paymentMethod', 'status', 'aging'],
    inventory: ['category', 'department', 'item', 'transactionType', 'expiry'],
    patients: ['day', 'month', 'gender', 'bloodType', 'ageGroup', 'returning'],
    'staff-workload': ['doctor', 'department', 'day'],
};

const defaultGroupings: Record<ReportType, string> = {
    appointments: 'status',
    clinical: 'category',
    financial: 'day',
    inventory: 'category',
    patients: 'month',
    'staff-workload': 'doctor',
};

export class ReportService {
    constructor(
        private readonly reportsRepository: ReportsRepository,
        private readonly templateRepository: ReportTemplateRepository,
    ) {}

    async getAppointmentReport(filters: ReportFilters): Promise<ReportResult> {
        return this.reportsRepository.getAppointmentReport(
            this.normalizeFilters('appointments', filters),
        );
    }

    async getClinicalReport(filters: ReportFilters): Promise<ReportResult> {
        return this.reportsRepository.getClinicalReport(
            this.normalizeFilters('clinical', filters),
        );
    }

    async getFinancialReport(filters: ReportFilters): Promise<ReportResult> {
        return this.reportsRepository.getFinancialReport(
            this.normalizeFilters('financial', filters),
        );
    }

    async getInventoryReport(filters: ReportFilters): Promise<ReportResult> {
        return this.reportsRepository.getInventoryReport(
            this.normalizeFilters('inventory', filters),
        );
    }

    async getPatientsReport(filters: ReportFilters): Promise<ReportResult> {
        return this.reportsRepository.getPatientsReport(
            this.normalizeFilters('patients', filters),
        );
    }

    async getStaffWorkloadReport(filters: ReportFilters): Promise<ReportResult> {
        return this.reportsRepository.getStaffWorkloadReport(
            this.normalizeFilters('staff-workload', filters),
        );
    }

    async saveTemplate(data: SaveReportTemplateData): Promise<ReportTemplate> {
        const normalized = {
            ...data,
            name: data.name.trim(),
            description: data.description?.trim() || null,
            parameters: data.parameters ?? {},
            createdBy: data.createdBy ?? null,
        };

        if (!normalized.name) {
            throw new AppError('Template name is required', 400);
        }

        return this.templateRepository.saveTemplate(normalized);
    }

    listTemplates(reportType?: ReportType): Promise<ReportTemplate[]> {
        return this.templateRepository.listTemplates(reportType);
    }

    private normalizeFilters(
        reportType: ReportType,
        filters: ReportFilters,
    ): ReportFilters {
        if (filters.from && filters.to && filters.from > filters.to) {
            throw new AppError('from must be before or equal to to', 400);
        }

        const groupBy = filters.groupBy ?? defaultGroupings[reportType];

        if (!allowedGroupings[reportType].includes(groupBy)) {
            throw new AppError(
                `Unsupported groupBy for ${reportType} report`,
                400,
            );
        }

        return {
            ...filters,
            groupBy,
        };
    }
}
