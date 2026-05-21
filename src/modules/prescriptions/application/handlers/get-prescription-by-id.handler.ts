import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { PrescriptionView } from '../../domain/prescription.entity';
import { PrescriptionService } from '../../services/prescription.service';
import { GetPrescriptionByIdQuery } from '../queries/get-prescription-by-id.query';

export class GetPrescriptionByIdHandler
implements QueryHandler<GetPrescriptionByIdQuery, PrescriptionView> {
    constructor(private readonly prescriptionService: PrescriptionService) {}

    execute(query: GetPrescriptionByIdQuery) {
        return this.prescriptionService.getPrescriptionById(
            query.id,
            query.actorUserId,
            query.canReadAll,
        );
    }
}
