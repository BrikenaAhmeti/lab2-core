import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { AdvancedSearchService } from '../../services/search.service';
import { SearchPatientsQuery } from '../queries/search-patients.query';

export class SearchPatientsHandler implements QueryHandler<SearchPatientsQuery, unknown> {
    constructor(private readonly searchService: AdvancedSearchService) {}

    execute(query: SearchPatientsQuery) {
        return this.searchService.searchPatients({
            page: query.page,
            limit: query.limit,
            search: query.search,
            gender: query.gender,
            minAge: query.minAge,
            maxAge: query.maxAge,
            bloodType: query.bloodType,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
    }
}
