import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { BillingPdfService } from '../../services/billing-pdf.service';
import { BillingService } from '../../services/billing.service';
import { GetBillingPdfQuery } from '../queries/get-billing-pdf.query';

export interface BillingPdfDocument {
    filename: string;
    pdf: Buffer;
}

export class GetBillingPdfHandler
implements QueryHandler<GetBillingPdfQuery, BillingPdfDocument> {
    constructor(
        private readonly billingService: BillingService,
        private readonly billingPdfService: BillingPdfService,
    ) {}

    async execute(query: GetBillingPdfQuery): Promise<BillingPdfDocument> {
        const billing = await this.billingService.getBillingById(
            query.id,
            query.actorUserId,
            query.canReadAll,
        );

        return {
            filename: BillingPdfService.fileName(billing),
            pdf: await this.billingPdfService.build(billing),
        };
    }
}
