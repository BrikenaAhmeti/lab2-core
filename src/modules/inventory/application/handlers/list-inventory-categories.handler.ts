import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { InventoryService } from '../../services/inventory.service';
import { ListInventoryCategoriesQuery } from '../queries/list-inventory-categories.query';

export class ListInventoryCategoriesHandler implements QueryHandler<ListInventoryCategoriesQuery, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(query: ListInventoryCategoriesQuery) {
        return this.inventoryService.listCategories({
            page: query.page,
            limit: query.limit,
            search: query.search,
            isActive: query.isActive,
        });
    }
}
