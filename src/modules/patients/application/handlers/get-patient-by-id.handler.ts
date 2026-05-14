import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { PatientService } from '../../services/patient.service';
import { GetPatientByIdQuery } from '../queries/get-patient-by-id.query';

export class GetPatientByIdHandler
    implements QueryHandler<GetPatientByIdQuery, unknown>
{
    constructor(private readonly patientService: PatientService) {}

    execute(query: GetPatientByIdQuery) {
        return this.patientService.getPatientById(
            query.id,
            query.actorUserId,
            query.canReadAll,
        );
    }
}
