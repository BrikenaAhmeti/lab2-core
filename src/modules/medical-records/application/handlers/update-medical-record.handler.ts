import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { MedicalRecordView } from '../../domain/medical-record.entity';
import { MedicalRecordService } from '../../services/medical-record.service';
import { UpdateMedicalRecordCommand } from '../commands/update-medical-record.command';

export class UpdateMedicalRecordHandler
implements CommandHandler<UpdateMedicalRecordCommand, MedicalRecordView> {
    constructor(private readonly medicalRecordService: MedicalRecordService) {}

    execute(command: UpdateMedicalRecordCommand) {
        return this.medicalRecordService.updateMedicalRecord(command.id, {
            chiefComplaint: command.chiefComplaint,
            vitals: command.vitals,
            diagnosis: command.diagnosis,
            treatmentPlan: command.treatmentPlan,
            notes: command.notes,
            followUpInstructions: command.followUpInstructions,
            actorUserId: command.actorUserId,
        });
    }
}
