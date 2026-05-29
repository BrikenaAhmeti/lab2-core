import { EmploymentStatus } from '../../../../generated/prisma';
import { Query } from '../../../../shared/core/buses/query-bus';
import { SearchSortOrder } from '../../domain/search.entity';

export class SearchStaffQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly departmentId?: string,
        public readonly positionTypeId?: string,
        public readonly status?: EmploymentStatus,
        public readonly sortBy?: string,
        public readonly sortOrder?: SearchSortOrder,
    ) {}
}
