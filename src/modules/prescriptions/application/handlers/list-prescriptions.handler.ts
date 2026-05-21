import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { PrescriptionListResult } from '../../domain/prescription.entity';
import { PrescriptionService } from '../../services/prescription.service';
import { ListPrescriptionsQuery } from '../queries/list-prescriptions.query';

export class ListPrescriptionsHandler
implements QueryHandler<ListPrescriptionsQuery, PrescriptionListResult> {
    constructor(private readonly prescriptionService: PrescriptionService) {}

    execute(query: ListPrescriptionsQuery) {
        return this.prescriptionService.listPrescriptions(
            {
                page: query.page,
                limit: query.limit,
                patientId: query.patientId,
                isVoided: query.isVoided,
            },
            query.actorUserId,
            query.canReadAll,
        );
    }
}
