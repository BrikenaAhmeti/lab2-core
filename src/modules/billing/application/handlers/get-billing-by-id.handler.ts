import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { BillingView } from '../../domain/billing.entity';
import { BillingService } from '../../services/billing.service';
import { GetBillingByIdQuery } from '../queries/get-billing-by-id.query';

export class GetBillingByIdHandler
implements QueryHandler<GetBillingByIdQuery, BillingView> {
    constructor(private readonly billingService: BillingService) {}

    execute(query: GetBillingByIdQuery): Promise<BillingView> {
        return this.billingService.getBillingById(
            query.id,
            query.actorUserId,
            query.canReadAll,
        );
    }
}
