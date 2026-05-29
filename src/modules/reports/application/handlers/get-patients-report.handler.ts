import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ReportResult } from '../../domain/reports.entity';
import { ReportService } from '../../services/report.service';
import { GetPatientsReportQuery } from '../queries/get-patients-report.query';

export class GetPatientsReportHandler
    implements QueryHandler<GetPatientsReportQuery, ReportResult> {
    constructor(private readonly reportService: ReportService) {}

    execute(query: GetPatientsReportQuery): Promise<ReportResult> {
        return this.reportService.getPatientsReport(query.filters);
    }
}
