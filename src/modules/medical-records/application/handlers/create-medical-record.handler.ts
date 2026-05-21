import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { MedicalRecordView } from '../../domain/medical-record.entity';
import { MedicalRecordService } from '../../services/medical-record.service';
import { CreateMedicalRecordCommand } from '../commands/create-medical-record.command';

export class CreateMedicalRecordHandler
implements CommandHandler<CreateMedicalRecordCommand, MedicalRecordView> {
    constructor(private readonly medicalRecordService: MedicalRecordService) {}

    execute(command: CreateMedicalRecordCommand) {
        return this.medicalRecordService.createMedicalRecord({
            patientId: command.patientId,
            appointmentId: command.appointmentId,
            staffProfileId: command.staffProfileId,
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
