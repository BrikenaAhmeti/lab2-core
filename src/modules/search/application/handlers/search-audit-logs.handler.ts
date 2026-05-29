import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { AdvancedSearchService } from '../../services/search.service';
import { SearchAuditLogsQuery } from '../queries/search-audit-logs.query';

export class SearchAuditLogsHandler implements QueryHandler<SearchAuditLogsQuery, unknown> {
    constructor(private readonly searchService: AdvancedSearchService) {}

    execute(query: SearchAuditLogsQuery) {
        return this.searchService.searchAuditLogs({
            page: query.page,
            limit: query.limit,
            search: query.search,
            userId: query.userId,
            action: query.action,
            entity: query.entity,
            from: query.from,
            to: query.to,
            ip: query.ip,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
        });
    }
}
