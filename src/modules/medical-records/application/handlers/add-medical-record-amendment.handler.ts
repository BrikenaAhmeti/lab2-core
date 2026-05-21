import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { MedicalRecordAmendmentView } from '../../domain/medical-record.entity';
import { MedicalRecordService } from '../../services/medical-record.service';
import { AddMedicalRecordAmendmentCommand } from '../commands/add-medical-record-amendment.command';

export class AddMedicalRecordAmendmentHandler
implements CommandHandler<AddMedicalRecordAmendmentCommand, MedicalRecordAmendmentView> {
    constructor(private readonly medicalRecordService: MedicalRecordService) {}

    execute(command: AddMedicalRecordAmendmentCommand) {
        return this.medicalRecordService.addAmendment(command.id, {
            reason: command.reason,
            changes: command.changes,
            actorUserId: command.actorUserId,
        });
    }
}
