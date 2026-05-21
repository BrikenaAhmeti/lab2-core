import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { BillingStats } from '../../domain/billing.entity';
import { BillingService } from '../../services/billing.service';
import { GetBillingStatsQuery } from '../queries/get-billing-stats.query';

export class GetBillingStatsHandler
implements QueryHandler<GetBillingStatsQuery, BillingStats> {
    constructor(private readonly billingService: BillingService) {}

    execute(query: GetBillingStatsQuery): Promise<BillingStats> {
        return this.billingService.getBillingStats({
            from: query.from,
            to: query.to,
        });
    }
}
