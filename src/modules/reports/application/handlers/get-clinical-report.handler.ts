import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ReportResult } from '../../domain/reports.entity';
import { ReportService } from '../../services/report.service';
import { GetClinicalReportQuery } from '../queries/get-clinical-report.query';

export class GetClinicalReportHandler
    implements QueryHandler<GetClinicalReportQuery, ReportResult> {
    constructor(private readonly reportService: ReportService) {}

    execute(query: GetClinicalReportQuery): Promise<ReportResult> {
        return this.reportService.getClinicalReport(query.filters);
    }
}
