import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { InventoryService } from '../../services/inventory.service';
import { GetInventoryItemByIdQuery } from '../queries/get-inventory-item-by-id.query';

export class GetInventoryItemByIdHandler implements QueryHandler<GetInventoryItemByIdQuery, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(query: GetInventoryItemByIdQuery) {
        return this.inventoryService.getItemById(query.id);
    }
}
