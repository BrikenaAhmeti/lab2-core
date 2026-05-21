import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { MedicalRecordService } from '../../services/medical-record.service';
import { GetMedicalRecordByIdQuery } from '../queries/get-medical-record-by-id.query';

export class GetMedicalRecordByIdHandler
implements QueryHandler<GetMedicalRecordByIdQuery, unknown> {
    constructor(private readonly medicalRecordService: MedicalRecordService) {}

    execute(query: GetMedicalRecordByIdQuery) {
        return this.medicalRecordService.getMedicalRecordById(
            query.id,
            query.actorUserId,
            query.canReadAll,
        );
    }
}
