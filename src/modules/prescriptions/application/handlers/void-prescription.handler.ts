import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { PrescriptionView } from '../../domain/prescription.entity';
import { PrescriptionService } from '../../services/prescription.service';
import { VoidPrescriptionCommand } from '../commands/void-prescription.command';

export class VoidPrescriptionHandler
implements CommandHandler<VoidPrescriptionCommand, PrescriptionView> {
    constructor(private readonly prescriptionService: PrescriptionService) {}

    execute(command: VoidPrescriptionCommand) {
        return this.prescriptionService.voidPrescription(command.id, {
            reason: command.reason,
            actorUserId: command.actorUserId,
        });
    }
}
