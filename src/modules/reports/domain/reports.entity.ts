export const reportTypes = [
    'appointments',
    'clinical',
    'financial',
    'inventory',
    'patients',
    'staff-workload',
] as const;

export const reportExportFormats = ['csv', 'xlsx', 'pdf'] as const;

export type ReportType = (typeof reportTypes)[number];
export type ReportExportFormat = (typeof reportExportFormats)[number];

export type ReportRowValue = string | number | boolean | null;
export type ReportRow = Record<string, ReportRowValue>;

export interface ReportFilters {
    from?: Date;
    to?: Date;
    groupBy?: string;
    departmentId?: string;
    staffProfileId?: string;
    serviceCatalogId?: string;
    status?: string;
}

export interface ReportSummaryMetric {
    label: string;
    value: string | number;
}

export interface ReportResult {
    type: ReportType;
    title: string;
    generatedAt: Date;
    groupBy: string;
    filters: Record<string, string | null>;
    summary: ReportSummaryMetric[];
    rows: ReportRow[];
}

export interface ReportTemplate {
    id: string;
    name: string;
    description: string | null;
    reportType: ReportType;
    parameters: Record<string, unknown>;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface SaveReportTemplateData {
    name: string;
    description?: string | null;
    reportType: ReportType;
    parameters: Record<string, unknown>;
    createdBy?: string | null;
}
