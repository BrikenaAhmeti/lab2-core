import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { ImportJob } from '../../domain/data-exchange.entity';
import { DataExchangeService } from '../../services/data-exchange.service';
import { GetImportJobQuery } from '../queries/get-import-job.query';

export class GetImportJobHandler
    implements QueryHandler<GetImportJobQuery, ImportJob>
{
    constructor(private readonly service: DataExchangeService) {}

    async execute(query: GetImportJobQuery) {
        return this.service.getImportJob(query.jobId);
    }
}
