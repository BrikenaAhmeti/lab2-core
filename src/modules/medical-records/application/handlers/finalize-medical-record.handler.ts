import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { MedicalRecordView } from '../../domain/medical-record.entity';
import { MedicalRecordService } from '../../services/medical-record.service';
import { FinalizeMedicalRecordCommand } from '../commands/finalize-medical-record.command';

export class FinalizeMedicalRecordHandler
implements CommandHandler<FinalizeMedicalRecordCommand, MedicalRecordView> {
    constructor(private readonly medicalRecordService: MedicalRecordService) {}

    execute(command: FinalizeMedicalRecordCommand) {
        return this.medicalRecordService.finalizeMedicalRecord(
            command.id,
            command.actorUserId,
        );
    }
}
