import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { PatientService } from '../../services/patient.service';
import { GetPatientTimelineQuery } from '../queries/get-patient-timeline.query';

export class GetPatientTimelineHandler
    implements QueryHandler<GetPatientTimelineQuery, unknown>
{
    constructor(private readonly patientService: PatientService) {}

    execute(query: GetPatientTimelineQuery) {
        return this.patientService.getPatientTimeline(
            query.patientId,
            query.actorUserId,
            query.canReadAll,
        );
    }
}
