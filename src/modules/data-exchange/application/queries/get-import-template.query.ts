import { Query } from '../../../../shared/core/buses/query-bus';
import {
    ExchangeFormat,
    ImportEntity,
} from '../../domain/data-exchange.entity';

export class GetImportTemplateQuery implements Query {
    constructor(
        public readonly entity: ImportEntity,
        public readonly format: ExchangeFormat,
    ) {}
}
