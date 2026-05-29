import { Request, Response } from 'express';
import { z } from 'zod';
import { CommandBus } from '../../../shared/core/buses/command-bus';
import { QueryBus } from '../../../shared/core/buses/query-bus';
import { SaveReportTemplateCommand } from '../application/commands/save-report-template.command';
import { GetAppointmentsReportHandler } from '../application/handlers/get-appointments-report.handler';
import { GetClinicalReportHandler } from '../application/handlers/get-clinical-report.handler';
import { GetFinancialReportHandler } from '../application/handlers/get-financial-report.handler';
import { GetInventoryReportHandler } from '../application/handlers/get-inventory-report.handler';
import { GetPatientsReportHandler } from '../application/handlers/get-patients-report.handler';
import { GetStaffWorkloadReportHandler } from '../application/handlers/get-staff-workload-report.handler';
import { ListReportTemplatesHandler } from '../application/handlers/list-report-templates.handler';
import { SaveReportTemplateHandler } from '../application/handlers/save-report-template.handler';
import { GetAppointmentsReportQuery } from '../application/queries/get-appointments-report.query';
import { GetClinicalReportQuery } from '../application/queries/get-clinical-report.query';
import { GetFinancialReportQuery } from '../application/queries/get-financial-report.query';
import { GetInventoryReportQuery } from '../application/queries/get-inventory-report.query';
import { GetPatientsReportQuery } from '../application/queries/get-patients-report.query';
import { GetStaffWorkloadReportQuery } from '../application/queries/get-staff-workload-report.query';
import { ListReportTemplatesQuery } from '../application/queries/list-report-templates.query';
import {
    ReportExportFormat,
    ReportFilters,
    ReportResult,
    ReportType,
    reportExportFormats,
    reportTypes,
} from '../domain/reports.entity';
import { MongoReportTemplateRepository } from '../infrastructure/report-template.mongo.repository';
import { ReportsPrismaRepository } from '../infrastructure/reports.prisma.repository';
import { ReportExportService } from '../services/report-export.service';
import { ReportService } from '../services/report.service';

const dateTimeSchema = z.coerce
    .date()
    .refine((value) => !Number.isNaN(value.getTime()), 'Invalid date time');

const optionalDateTimeSchema = z.preprocess((value) => {
    if (value === undefined || value === '') {
        return undefined;
    }

    return value;
}, dateTimeSchema.optional());

const optionalTrimmedString = z.preprocess((value) => {
    if (value === undefined || value === '') {
        return undefined;
    }

    return value;
}, z.string().trim().min(1).max(100).optional());

const reportQuerySchema = z.object({
    from: optionalDateTimeSchema,
    to: optionalDateTimeSchema,
    groupBy: optionalTrimmedString,
    departmentId: z.string().uuid('Invalid department id').optional(),
    staffProfileId: z.string().uuid('Invalid staff profile id').optional(),
    serviceCatalogId: z.string().uuid('Invalid service id').optional(),
    status: optionalTrimmedString,
    export: z.enum(reportExportFormats).optional(),
});

const listTemplatesQuerySchema = z.object({
    reportType: z.enum(reportTypes).optional(),
});

const saveTemplateBodySchema = z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).nullable().optional(),
    reportType: z.enum(reportTypes),
    parameters: z.record(z.string(), z.unknown()).default({}),
});

function parseReportQuery(req: Request) {
    const query = reportQuerySchema.parse(req.query);
    const { export: exportFormat, ...filters } = query;

    return {
        filters,
        exportFormat,
    };
}

export class ReportsController {
    private readonly commandBus = new CommandBus();
    private readonly queryBus = new QueryBus();
    private readonly reportService = new ReportService(
        new ReportsPrismaRepository(),
        new MongoReportTemplateRepository(),
    );
    private readonly exportService = new ReportExportService();
    private readonly appointmentsHandler = new GetAppointmentsReportHandler(
        this.reportService,
    );
    private readonly clinicalHandler = new GetClinicalReportHandler(
        this.reportService,
    );
    private readonly financialHandler = new GetFinancialReportHandler(
        this.reportService,
    );
    private readonly inventoryHandler = new GetInventoryReportHandler(
        this.reportService,
    );
    private readonly patientsHandler = new GetPatientsReportHandler(
        this.reportService,
    );
    private readonly staffWorkloadHandler = new GetStaffWorkloadReportHandler(
        this.reportService,
    );
    private readonly listTemplatesHandler = new ListReportTemplatesHandler(
        this.reportService,
    );
    private readonly saveTemplateHandler = new SaveReportTemplateHandler(
        this.reportService,
    );

    async appointments(req: Request, res: Response) {
        const { filters, exportFormat } = parseReportQuery(req);
        const report = await this.queryBus.execute(
            this.appointmentsHandler,
            new GetAppointmentsReportQuery(filters),
        );

        return this.sendReport(res, report, exportFormat);
    }

    async clinical(req: Request, res: Response) {
        const { filters, exportFormat } = parseReportQuery(req);
        const report = await this.queryBus.execute(
            this.clinicalHandler,
            new GetClinicalReportQuery(filters),
        );

        return this.sendReport(res, report, exportFormat);
    }

    async financial(req: Request, res: Response) {
        const { filters, exportFormat } = parseReportQuery(req);
        const report = await this.queryBus.execute(
            this.financialHandler,
            new GetFinancialReportQuery(filters),
        );

        return this.sendReport(res, report, exportFormat);
    }

    async inventory(req: Request, res: Response) {
        const { filters, exportFormat } = parseReportQuery(req);
        const report = await this.queryBus.execute(
            this.inventoryHandler,
            new GetInventoryReportQuery(filters),
        );

        return this.sendReport(res, report, exportFormat);
    }

    async patients(req: Request, res: Response) {
        const { filters, exportFormat } = parseReportQuery(req);
        const report = await this.queryBus.execute(
            this.patientsHandler,
            new GetPatientsReportQuery(filters),
        );

        return this.sendReport(res, report, exportFormat);
    }

    async staffWorkload(req: Request, res: Response) {
        const { filters, exportFormat } = parseReportQuery(req);
        const report = await this.queryBus.execute(
            this.staffWorkloadHandler,
            new GetStaffWorkloadReportQuery(filters),
        );

        return this.sendReport(res, report, exportFormat);
    }

    async listTemplates(req: Request, res: Response) {
        const query = listTemplatesQuerySchema.parse(req.query);
        const templates = await this.queryBus.execute(
            this.listTemplatesHandler,
            new ListReportTemplatesQuery(query.reportType as ReportType | undefined),
        );

        return res.status(200).json({ items: templates });
    }

    async saveTemplate(req: Request, res: Response) {
        const body = saveTemplateBodySchema.parse(req.body);
        const template = await this.commandBus.execute(
            this.saveTemplateHandler,
            new SaveReportTemplateCommand(
                body.name,
                body.reportType,
                body.parameters,
                body.description,
                req.user?.id ?? null,
            ),
        );

        return res.status(201).json(template);
    }

    private async sendReport(
        res: Response,
        report: ReportResult,
        exportFormat?: ReportExportFormat,
    ) {
        if (!exportFormat) {
            return res.status(200).json(report);
        }

        const file = await this.exportService.export(report, exportFormat);

        res.setHeader('Content-Type', file.contentType);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${file.filename}"`,
        );

        return res.status(200).send(file.buffer);
    }
}
