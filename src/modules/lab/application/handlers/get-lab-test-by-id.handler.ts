import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { LabTestEntity } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { GetLabTestByIdQuery } from '../queries/get-lab-test-by-id.query';

export class GetLabTestByIdHandler
    implements QueryHandler<GetLabTestByIdQuery, LabTestEntity> {
    constructor(private readonly labService: LabService) {}

    execute(query: GetLabTestByIdQuery) {
        return this.labService.getLabTestById(query.id);
    }
}
