import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { PrescriptionPdfService } from '../../services/prescription-pdf.service';
import { PrescriptionService } from '../../services/prescription.service';
import { GetPrescriptionPdfQuery } from '../queries/get-prescription-pdf.query';

export class GetPrescriptionPdfHandler
implements QueryHandler<GetPrescriptionPdfQuery, Buffer> {
    constructor(
        private readonly prescriptionService: PrescriptionService,
        private readonly prescriptionPdfService: PrescriptionPdfService,
    ) {}

    async execute(query: GetPrescriptionPdfQuery) {
        const prescription = await this.prescriptionService.getPrescriptionById(
            query.id,
            query.actorUserId,
            query.canReadAll,
        );

        return this.prescriptionPdfService.build(prescription);
    }
}
