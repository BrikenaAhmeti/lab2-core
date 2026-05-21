import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { LabOrderListResult } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { ListLabOrdersQuery } from '../queries/list-lab-orders.query';

export class ListLabOrdersHandler
    implements QueryHandler<ListLabOrdersQuery, LabOrderListResult> {
    constructor(private readonly labService: LabService) {}

    execute(query: ListLabOrdersQuery) {
        return this.labService.listLabOrders(
            {
                page: query.page,
                limit: query.limit,
                patientId: query.patientId,
                status: query.status,
                priority: query.priority,
                from: query.from,
                to: query.to,
            },
            query.actorUserId,
            query.canReadAll,
        );
    }
}
