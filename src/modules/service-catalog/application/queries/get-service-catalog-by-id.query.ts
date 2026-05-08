import { Query } from '../../../../shared/core/buses/query-bus';

export class GetServiceCatalogByIdQuery implements Query {
    constructor(public readonly id: string) { }
}
