import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { BillingPdfService } from '../../services/billing-pdf.service';
import { BillingService } from '../../services/billing.service';
import { GetBillingPdfQuery } from '../queries/get-billing-pdf.query';

export class GetBillingPdfHandler
implements QueryHandler<GetBillingPdfQuery, Buffer> {
    constructor(
        private readonly billingService: BillingService,
        private readonly billingPdfService: BillingPdfService,
    ) {}

    async execute(query: GetBillingPdfQuery): Promise<Buffer> {
        const billing = await this.billingService.getBillingById(
            query.id,
            query.actorUserId,
            query.canReadAll,
        );

        return this.billingPdfService.build(billing);
    }
}
