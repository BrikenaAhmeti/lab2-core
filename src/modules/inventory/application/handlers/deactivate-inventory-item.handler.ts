import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { InventoryService } from '../../services/inventory.service';
import { DeactivateInventoryItemCommand } from '../commands/deactivate-inventory-item.command';

export class DeactivateInventoryItemHandler implements CommandHandler<DeactivateInventoryItemCommand, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(command: DeactivateInventoryItemCommand) {
        return this.inventoryService.deactivateItem(command.id, command.actorUserId);
    }
}
