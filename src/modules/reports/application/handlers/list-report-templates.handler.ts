import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ReportTemplate } from '../../domain/reports.entity';
import { ReportService } from '../../services/report.service';
import { ListReportTemplatesQuery } from '../queries/list-report-templates.query';

export class ListReportTemplatesHandler
    implements QueryHandler<ListReportTemplatesQuery, ReportTemplate[]> {
    constructor(private readonly reportService: ReportService) {}

    execute(query: ListReportTemplatesQuery): Promise<ReportTemplate[]> {
        return this.reportService.listTemplates(query.reportType);
    }
}
