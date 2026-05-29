import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { PharmacyQueueView } from '../../domain/pharmacy.entity';
import { PharmacyService } from '../../services/pharmacy.service';
import { GetPharmacyQueueByIdQuery } from '../queries/get-pharmacy-queue-by-id.query';

export class GetPharmacyQueueByIdHandler
    implements QueryHandler<GetPharmacyQueueByIdQuery, PharmacyQueueView>
{
    constructor(private readonly pharmacyService: PharmacyService) {}

    async execute(query: GetPharmacyQueueByIdQuery): Promise<PharmacyQueueView> {
        return this.pharmacyService.getQueueById(query.id);
    }
}
