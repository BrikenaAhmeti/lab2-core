import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { LabOrderView } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { GetLabOrderByIdQuery } from '../queries/get-lab-order-by-id.query';

export class GetLabOrderByIdHandler
    implements QueryHandler<GetLabOrderByIdQuery, LabOrderView> {
    constructor(private readonly labService: LabService) {}

    execute(query: GetLabOrderByIdQuery) {
        return this.labService.getLabOrderById(
            query.id,
            query.actorUserId,
            query.canReadAll,
        );
    }
}
