import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { AdvancedSearchService } from '../../services/search.service';
import { SearchInventoryItemsQuery } from '../queries/search-inventory-items.query';

export class SearchInventoryItemsHandler implements QueryHandler<SearchInventoryItemsQuery, unknown> {
    constructor(private readonly searchService: AdvancedSearchService) {}

    execute(query: SearchInventoryItemsQuery) {
        return this.searchService.searchInventoryItems({
            page: query.page,
            limit: query.limit,
            search: query.search,
            categoryId: query.categoryId,
            category: query.category,
            stockLevel: query.stockLevel,
            departmentId: query.departmentId,
            expiryFrom: query.expiryFrom,
            expiryTo: query.expiryTo,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
    }
}
