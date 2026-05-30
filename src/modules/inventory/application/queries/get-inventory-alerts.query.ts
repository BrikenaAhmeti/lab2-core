import { Query } from '../../../../shared/core/buses/query-bus';

export class GetInventoryAlertsQuery implements Query {
    constructor(public readonly expiringSoonDays?: number) {}
}
