import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { InventoryService } from '../../services/inventory.service';
import { GetInventoryCategoryByIdQuery } from '../queries/get-inventory-category-by-id.query';

export class GetInventoryCategoryByIdHandler implements QueryHandler<GetInventoryCategoryByIdQuery, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(query: GetInventoryCategoryByIdQuery) {
        return this.inventoryService.getCategoryById(query.id);
    }
}
