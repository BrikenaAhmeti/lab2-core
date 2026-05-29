import { Query } from '../../../../shared/core/buses/query-bus';
import { ReportType } from '../../domain/reports.entity';

export class ListReportTemplatesQuery implements Query {
    constructor(public readonly reportType?: ReportType) {}
}
