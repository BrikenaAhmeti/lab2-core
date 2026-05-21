import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { LabOrderView } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { UpdateLabOrderStatusCommand } from '../commands/update-lab-order-status.command';

export class UpdateLabOrderStatusHandler
    implements CommandHandler<UpdateLabOrderStatusCommand, LabOrderView> {
    constructor(private readonly labService: LabService) {}

    execute(command: UpdateLabOrderStatusCommand) {
        return this.labService.updateLabOrderStatus(
            command.id,
            command.status,
            command.actorUserId,
        );
    }
}
