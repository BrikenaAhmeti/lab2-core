import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { InventoryService } from '../../services/inventory.service';
import { DeactivateInventoryCategoryCommand } from '../commands/deactivate-inventory-category.command';

export class DeactivateInventoryCategoryHandler implements CommandHandler<DeactivateInventoryCategoryCommand, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(command: DeactivateInventoryCategoryCommand) {
        return this.inventoryService.deactivateCategory(command.id, command.actorUserId);
    }
}
