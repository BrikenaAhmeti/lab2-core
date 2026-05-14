import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { PatientService } from '../../services/patient.service';
import { ListPatientsQuery } from '../queries/list-patients.query';

export class ListPatientsHandler implements QueryHandler<ListPatientsQuery, unknown> {
    constructor(private readonly patientService: PatientService) {}

    execute(query: ListPatientsQuery) {
        return this.patientService.listPatients({
            page: query.page,
            limit: query.limit,
            search: query.search,
            gender: query.gender,
            bloodType: query.bloodType,
        });
    }
}
