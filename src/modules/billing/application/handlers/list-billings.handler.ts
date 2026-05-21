import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { BillingListResult } from '../../domain/billing.entity';
import { BillingService } from '../../services/billing.service';
import { ListBillingsQuery } from '../queries/list-billings.query';

export class ListBillingsHandler
implements QueryHandler<ListBillingsQuery, BillingListResult> {
    constructor(private readonly billingService: BillingService) {}

    execute(query: ListBillingsQuery): Promise<BillingListResult> {
        return this.billingService.listBillings(
            {
                page: query.page,
                limit: query.limit,
                patientId: query.patientId,
                status: query.status,
                from: query.from,
                to: query.to,
            },
            query.actorUserId,
            query.canReadAll,
        );
    }
}
