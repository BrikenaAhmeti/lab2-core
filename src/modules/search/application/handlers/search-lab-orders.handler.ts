import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { AdvancedSearchService } from '../../services/search.service';
import { SearchLabOrdersQuery } from '../queries/search-lab-orders.query';

export class SearchLabOrdersHandler implements QueryHandler<SearchLabOrdersQuery, unknown> {
    constructor(private readonly searchService: AdvancedSearchService) {}

    execute(query: SearchLabOrdersQuery) {
        return this.searchService.searchLabOrders({
            page: query.page,
            limit: query.limit,
            search: query.search,
            status: query.status,
            priority: query.priority,
            from: query.from,
            to: query.to,
            hasCritical: query.hasCritical,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
    }
}
