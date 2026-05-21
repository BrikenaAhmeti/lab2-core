import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { LabTestListResult } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { ListLabTestsQuery } from '../queries/list-lab-tests.query';

export class ListLabTestsHandler
    implements QueryHandler<ListLabTestsQuery, LabTestListResult> {
    constructor(private readonly labService: LabService) {}

    execute(query: ListLabTestsQuery) {
        return this.labService.listLabTests({
            page: query.page,
            limit: query.limit,
            search: query.search,
            category: query.category,
            isActive: query.isActive,
        });
    }
}
