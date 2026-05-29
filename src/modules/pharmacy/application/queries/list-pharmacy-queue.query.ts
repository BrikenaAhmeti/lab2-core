import { PharmacyStatus } from '../../../../generated/prisma';
import { Query } from '../../../../shared/core/buses/query-bus';

export class ListPharmacyQueueQuery implements Query {
    constructor(
        public readonly page: number,
        public readonly limit: number,
        public readonly status?: PharmacyStatus,
    ) {}
}
