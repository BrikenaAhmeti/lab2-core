import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ReportResult } from '../../domain/reports.entity';
import { ReportService } from '../../services/report.service';
import { GetFinancialReportQuery } from '../queries/get-financial-report.query';

export class GetFinancialReportHandler
    implements QueryHandler<GetFinancialReportQuery, ReportResult> {
    constructor(private readonly reportService: ReportService) {}

    execute(query: GetFinancialReportQuery): Promise<ReportResult> {
        return this.reportService.getFinancialReport(query.filters);
    }
}
