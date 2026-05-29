import {
    ReportFilters,
    ReportResult,
    ReportTemplate,
    ReportType,
    SaveReportTemplateData,
} from './reports.entity';

export interface ReportsRepository {
    getAppointmentReport(filters: ReportFilters): Promise<ReportResult>;
    getClinicalReport(filters: ReportFilters): Promise<ReportResult>;
    getFinancialReport(filters: ReportFilters): Promise<ReportResult>;
    getInventoryReport(filters: ReportFilters): Promise<ReportResult>;
    getPatientsReport(filters: ReportFilters): Promise<ReportResult>;
    getStaffWorkloadReport(filters: ReportFilters): Promise<ReportResult>;
}

export interface ReportTemplateRepository {
    saveTemplate(data: SaveReportTemplateData): Promise<ReportTemplate>;
    listTemplates(reportType?: ReportType): Promise<ReportTemplate[]>;
}
