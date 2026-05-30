import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { InventoryService } from '../../services/inventory.service';
import { RecordInventoryTransactionCommand } from '../commands/record-inventory-transaction.command';

export class RecordInventoryTransactionHandler implements CommandHandler<RecordInventoryTransactionCommand, unknown> {
    constructor(private readonly inventoryService: InventoryService) {}

    execute(command: RecordInventoryTransactionCommand) {
        return this.inventoryService.recordTransaction(command.itemId, {
            type: command.type,
            quantity: command.quantity,
            reason: command.reason,
            unitCost: command.unitCost,
            batchNumber: command.batchNumber,
            expiryDate: command.expiryDate,
            referenceEntityType: command.referenceEntityType,
            referenceEntityId: command.referenceEntityId,
            targetDepartmentId: command.targetDepartmentId,
            actorUserId: command.actorUserId,
        });
    }
}
