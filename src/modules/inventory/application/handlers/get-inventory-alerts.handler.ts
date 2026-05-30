import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { InventoryService } from '../../services/inventory.service';
import { GetInventoryAlertsQuery } from '../queries/get-inventory-alerts.query';

export class GetInventoryAlertsHandler implements QueryHandler<GetInventoryAlertsQuery, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(query: GetInventoryAlertsQuery) {
        return this.inventoryService.getAlerts(query.expiringSoonDays);
    }
}
