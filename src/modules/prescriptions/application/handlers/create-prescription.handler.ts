import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { PrescriptionView } from '../../domain/prescription.entity';
import { PrescriptionService } from '../../services/prescription.service';
import { CreatePrescriptionCommand } from '../commands/create-prescription.command';

export class CreatePrescriptionHandler
implements CommandHandler<CreatePrescriptionCommand, PrescriptionView> {
    constructor(private readonly prescriptionService: PrescriptionService) {}

    execute(command: CreatePrescriptionCommand) {
        return this.prescriptionService.createPrescription({
            medicalRecordId: command.medicalRecordId,
            items: command.items,
            expiresAt: command.expiresAt,
            notes: command.notes,
            actorUserId: command.actorUserId,
        });
    }
}
