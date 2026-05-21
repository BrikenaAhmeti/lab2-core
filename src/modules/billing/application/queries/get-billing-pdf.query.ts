import { Query } from '../../../../shared/core/buses/query-bus';

export class GetBillingPdfQuery implements Query {
    constructor(
        public readonly id: string,
        public readonly actorUserId?: string,
        public readonly canReadAll = false,
    ) {}
}
