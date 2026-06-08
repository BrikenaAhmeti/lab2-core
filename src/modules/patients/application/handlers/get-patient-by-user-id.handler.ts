import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { PatientService } from '../../services/patient.service';
import { GetPatientByUserIdQuery } from '../queries/get-patient-by-user-id.query';

export class GetPatientByUserIdHandler
    implements QueryHandler<GetPatientByUserIdQuery, unknown>
{
    constructor(private readonly patientService: PatientService) {}

    execute(query: GetPatientByUserIdQuery) {
        return this.patientService.getPatientByUserId(query.userId);
    }
}
