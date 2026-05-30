import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { InventoryService } from '../../services/inventory.service';
import { ListInventoryItemsQuery } from '../queries/list-inventory-items.query';

export class ListInventoryItemsHandler implements QueryHandler<ListInventoryItemsQuery, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(query: ListInventoryItemsQuery) {
        return this.inventoryService.listItems({
            page: query.page,
            limit: query.limit,
            search: query.search,
            categoryId: query.categoryId,
            departmentId: query.departmentId,
            belowReorderLevel: query.belowReorderLevel,
            expiringSoonDays: query.expiringSoonDays,
            isActive: query.isActive,
            sortBy: query.sortBy,
            sortDirection: query.sortDirection,
        });
    }
}
