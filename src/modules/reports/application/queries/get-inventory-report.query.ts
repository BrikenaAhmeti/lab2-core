import { Query } from '../../../../shared/core/buses/query-bus';
import { ReportFilters } from '../../domain/reports.entity';

export class GetInventoryReportQuery implements Query {
    constructor(public readonly filters: ReportFilters) {}
}
