import { Query } from '../../../../shared/core/buses/query-bus';

export class GetImportJobQuery implements Query {
    constructor(public readonly jobId: string) {}
}
