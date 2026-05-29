import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ReportResult } from '../../domain/reports.entity';
import { ReportService } from '../../services/report.service';
import { GetInventoryReportQuery } from '../queries/get-inventory-report.query';

export class GetInventoryReportHandler
    implements QueryHandler<GetInventoryReportQuery, ReportResult> {
    constructor(private readonly reportService: ReportService) {}

    execute(query: GetInventoryReportQuery): Promise<ReportResult> {
        return this.reportService.getInventoryReport(query.filters);
    }
}
