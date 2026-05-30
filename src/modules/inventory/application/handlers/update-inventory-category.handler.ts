import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { InventoryService } from '../../services/inventory.service';
import { UpdateInventoryCategoryCommand } from '../commands/update-inventory-category.command';

export class UpdateInventoryCategoryHandler implements CommandHandler<UpdateInventoryCategoryCommand, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(command: UpdateInventoryCategoryCommand) {
        return this.inventoryService.updateCategory(command.id, {
            name: command.name,
            description: command.description,
            parentId: command.parentId,
            isActive: command.isActive,
            actorUserId: command.actorUserId,
        });
    }
}
