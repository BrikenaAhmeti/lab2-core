import { Query } from '../../../../shared/core/buses/query-bus';
import { SearchSortOrder } from '../../domain/search.entity';

export class SearchAuditLogsQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly userId?: string,
        public readonly action?: string,
        public readonly entity?: string,
        public readonly from?: Date,
        public readonly to?: Date,
        public readonly ip?: string,
        public readonly sortBy?: string,
        public readonly sortOrder?: SearchSortOrder,
    ) {}
}
