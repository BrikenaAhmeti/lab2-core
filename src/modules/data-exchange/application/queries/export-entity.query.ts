import { Query } from '../../../../shared/core/buses/query-bus';
import {
    ExchangeFormat,
    ExportEntity,
} from '../../domain/data-exchange.entity';

export class ExportEntityQuery implements Query {
    constructor(
        public readonly entity: ExportEntity,
        public readonly format: ExchangeFormat,
    ) {}
}
