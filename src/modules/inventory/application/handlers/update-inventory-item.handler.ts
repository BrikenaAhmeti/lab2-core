import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { InventoryService } from '../../services/inventory.service';
import { UpdateInventoryItemCommand } from '../commands/update-inventory-item.command';

export class UpdateInventoryItemHandler implements CommandHandler<UpdateInventoryItemCommand, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(command: UpdateInventoryItemCommand) {
        return this.inventoryService.updateItem(command.id, {
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
