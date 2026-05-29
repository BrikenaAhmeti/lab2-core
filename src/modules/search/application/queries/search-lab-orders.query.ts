import { LabOrderStatus } from '../../../../generated/prisma';
import { Query } from '../../../../shared/core/buses/query-bus';
import { SearchSortOrder } from '../../domain/search.entity';

export class SearchLabOrdersQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly status?: LabOrderStatus,
        public readonly priority?: string,
        public readonly from?: Date,
        public readonly to?: Date,
        public readonly hasCritical?: boolean,
        public readonly sortBy?: string,
        public readonly sortOrder?: SearchSortOrder,
    ) {}
}
