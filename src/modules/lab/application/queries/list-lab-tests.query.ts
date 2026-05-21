import { Query } from '../../../../shared/core/buses/query-bus';

export class ListLabTestsQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly search?: string,
        public readonly category?: string,
        public readonly isActive?: boolean,
    ) {}
}
