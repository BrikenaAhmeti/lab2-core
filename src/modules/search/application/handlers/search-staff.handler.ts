import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { AdvancedSearchService } from '../../services/search.service';
import { SearchStaffQuery } from '../queries/search-staff.query';

export class SearchStaffHandler implements QueryHandler<SearchStaffQuery, unknown> {
    constructor(private readonly searchService: AdvancedSearchService) {}

    execute(query: SearchStaffQuery) {
        return this.searchService.searchStaff({
            page: query.page,
            limit: query.limit,
            search: query.search,
            departmentId: query.departmentId,
            positionTypeId: query.positionTypeId,
            status: query.status,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
    }
}
