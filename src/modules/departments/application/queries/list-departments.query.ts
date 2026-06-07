import { Query } from '../../../../shared/core/buses/query-bus';

export class ListDepartmentsQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly isActive?: boolean,
        public readonly sortBy?: 'name' | 'sortOrder' | 'createdAt' | 'updatedAt',
        public readonly sortDirection?: 'asc' | 'desc',
        public readonly openAt?: string,
        public readonly openFrom?: string,
        public readonly openTo?: string,
    ) { }
}
