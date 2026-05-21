import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { LabTestEntity } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { CreateLabTestCommand } from '../commands/create-lab-test.command';

export class CreateLabTestHandler
    implements CommandHandler<CreateLabTestCommand, LabTestEntity> {
    constructor(private readonly labService: LabService) {}

    execute(command: CreateLabTestCommand) {
        return this.labService.createLabTest({
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
