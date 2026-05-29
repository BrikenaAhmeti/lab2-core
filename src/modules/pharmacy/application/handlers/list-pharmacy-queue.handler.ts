import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { PharmacyQueueListResult } from '../../domain/pharmacy.entity';
import { PharmacyService } from '../../services/pharmacy.service';
import { ListPharmacyQueueQuery } from '../queries/list-pharmacy-queue.query';

export class ListPharmacyQueueHandler
    implements QueryHandler<ListPharmacyQueueQuery, PharmacyQueueListResult>
{
    constructor(private readonly pharmacyService: PharmacyService) {}

    async execute(
        query: ListPharmacyQueueQuery,
    ): Promise<PharmacyQueueListResult> {
        return this.pharmacyService.listQueue({
            page: query.page,
            limit: query.limit,
            status: query.status,
        });
    }
}
