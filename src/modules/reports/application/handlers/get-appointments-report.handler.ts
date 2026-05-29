import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ReportResult } from '../../domain/reports.entity';
import { ReportService } from '../../services/report.service';
import { GetAppointmentsReportQuery } from '../queries/get-appointments-report.query';

export class GetAppointmentsReportHandler
    implements QueryHandler<GetAppointmentsReportQuery, ReportResult> {
    constructor(private readonly reportService: ReportService) {}

    execute(query: GetAppointmentsReportQuery): Promise<ReportResult> {
        return this.reportService.getAppointmentReport(query.filters);
    }
}
