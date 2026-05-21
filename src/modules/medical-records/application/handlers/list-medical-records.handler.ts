import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { MedicalRecordService } from '../../services/medical-record.service';
import { ListMedicalRecordsQuery } from '../queries/list-medical-records.query';

export class ListMedicalRecordsHandler
implements QueryHandler<ListMedicalRecordsQuery, unknown> {
    constructor(private readonly medicalRecordService: MedicalRecordService) {}

    execute(query: ListMedicalRecordsQuery) {
        return this.medicalRecordService.listMedicalRecords(
            {
                page: query.page,
                limit: query.limit,
                patientId: query.patientId,
            },
            query.actorUserId,
            query.canReadAll,
        );
    }
}
