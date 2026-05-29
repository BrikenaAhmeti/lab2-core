import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { DataExchangeFile } from '../../domain/data-exchange.entity';
import { DataExchangeService } from '../../services/data-exchange.service';
import { GetImportTemplateQuery } from '../queries/get-import-template.query';

export class GetImportTemplateHandler
    implements QueryHandler<GetImportTemplateQuery, DataExchangeFile>
{
    constructor(private readonly service: DataExchangeService) {}

    execute(query: GetImportTemplateQuery) {
        return this.service.getImportTemplate(query.entity, query.format);
    }
}
