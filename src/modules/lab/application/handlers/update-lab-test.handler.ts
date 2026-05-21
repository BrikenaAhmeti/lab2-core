import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { LabTestEntity } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { UpdateLabTestCommand } from '../commands/update-lab-test.command';

export class UpdateLabTestHandler
    implements CommandHandler<UpdateLabTestCommand, LabTestEntity> {
    constructor(private readonly labService: LabService) {}

    execute(command: UpdateLabTestCommand) {
        return this.labService.updateLabTest(command.id, {
            code: command.code,
            name: command.name,
            description: command.description,
            category: command.category,
            sampleType: command.sampleType,
            defaultPrice: command.defaultPrice,
            referenceRange: command.referenceRange,
            isActive: command.isActive,
            actorUserId: command.actorUserId,
        });
    }
}
