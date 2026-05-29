import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { AdvancedSearchService } from '../../services/search.service';
import { SearchAppointmentsQuery } from '../queries/search-appointments.query';

export class SearchAppointmentsHandler implements QueryHandler<SearchAppointmentsQuery, unknown> {
    constructor(private readonly searchService: AdvancedSearchService) {}

    execute(query: SearchAppointmentsQuery) {
        return this.searchService.searchAppointments({
            page: query.page,
            limit: query.limit,
            search: query.search,
            status: query.status,
            from: query.from,
            to: query.to,
            departmentId: query.departmentId,
            serviceCatalogId: query.serviceCatalogId,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
    }
}
