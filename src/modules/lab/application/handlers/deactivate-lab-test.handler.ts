import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { LabTestEntity } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { DeactivateLabTestCommand } from '../commands/deactivate-lab-test.command';

export class DeactivateLabTestHandler
    implements CommandHandler<DeactivateLabTestCommand, LabTestEntity> {
    constructor(private readonly labService: LabService) {}

    execute(command: DeactivateLabTestCommand) {
        return this.labService.deactivateLabTest(command.id, command.actorUserId);
    }
}
