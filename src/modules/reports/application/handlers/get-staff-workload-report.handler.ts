import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ReportResult } from '../../domain/reports.entity';
import { ReportService } from '../../services/report.service';
import { GetStaffWorkloadReportQuery } from '../queries/get-staff-workload-report.query';

export class GetStaffWorkloadReportHandler
    implements QueryHandler<GetStaffWorkloadReportQuery, ReportResult> {
    constructor(private readonly reportService: ReportService) {}

    execute(query: GetStaffWorkloadReportQuery): Promise<ReportResult> {
        return this.reportService.getStaffWorkloadReport(query.filters);
    }
}
