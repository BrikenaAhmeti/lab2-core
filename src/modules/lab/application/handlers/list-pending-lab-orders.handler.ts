import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { LabOrderView } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { ListPendingLabOrdersQuery } from '../queries/list-pending-lab-orders.query';

export class ListPendingLabOrdersHandler
    implements QueryHandler<ListPendingLabOrdersQuery, LabOrderView[]> {
    constructor(private readonly labService: LabService) {}

    execute(_query: ListPendingLabOrdersQuery) {
        return this.labService.listPendingLabOrders();
    }
}
