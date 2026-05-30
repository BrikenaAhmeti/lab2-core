import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { InventoryService } from '../../services/inventory.service';
import { ListInventoryTransactionsQuery } from '../queries/list-inventory-transactions.query';

export class ListInventoryTransactionsHandler implements QueryHandler<ListInventoryTransactionsQuery, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(query: ListInventoryTransactionsQuery) {
        return this.inventoryService.listTransactions(query.itemId, {
            page: query.page,
            limit: query.limit,
        });
    }
}
