import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { InventoryService } from '../../services/inventory.service';
import { CreateInventoryCategoryCommand } from '../commands/create-inventory-category.command';

export class CreateInventoryCategoryHandler implements CommandHandler<CreateInventoryCategoryCommand, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(command: CreateInventoryCategoryCommand) {
        return this.inventoryService.createCategory({
            name: command.name,
            description: command.description,
            parentId: command.parentId,
            isActive: command.isActive,
            actorUserId: command.actorUserId,
        });
    }
}
