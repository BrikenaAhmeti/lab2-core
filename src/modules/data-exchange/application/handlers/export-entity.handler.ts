import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { DataExchangeFile } from '../../domain/data-exchange.entity';
import { DataExchangeService } from '../../services/data-exchange.service';
import { ExportEntityQuery } from '../queries/export-entity.query';

export class ExportEntityHandler
    implements QueryHandler<ExportEntityQuery, DataExchangeFile>
{
    constructor(private readonly service: DataExchangeService) {}

    execute(query: ExportEntityQuery) {
        return this.service.exportEntity(query.entity, query.format);
    }
}
