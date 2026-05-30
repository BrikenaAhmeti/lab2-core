import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { InventoryService } from '../../services/inventory.service';
import { CreateInventoryItemCommand } from '../commands/create-inventory-item.command';

export class CreateInventoryItemHandler implements CommandHandler<CreateInventoryItemCommand, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(command: CreateInventoryItemCommand) {
        return this.inventoryService.createItem({
            categoryId: command.categoryId,
            departmentId: command.departmentId,
            sku: command.sku,
            name: command.name,
            description: command.description,
            unitOfMeasure: command.unitOfMeasure,
            currentStock: command.currentStock,
            reorderLevel: command.reorderLevel,
            unitCost: command.unitCost,
            expiryDate: command.expiryDate,
            isActive: command.isActive,
            actorUserId: command.actorUserId,
        });
    }
}
