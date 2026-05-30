import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { LinkPatientByPersonalNumberResult } from '../../domain/patient.entity';
import { PatientService } from '../../services/patient.service';
import { LinkPatientByPersonalNumberCommand } from '../commands/link-patient-by-personal-number.command';

export class LinkPatientByPersonalNumberHandler
    implements
        CommandHandler<
            LinkPatientByPersonalNumberCommand,
            LinkPatientByPersonalNumberResult
        >
{
    constructor(private readonly patientService: PatientService) {}

    execute(command: LinkPatientByPersonalNumberCommand) {
        return this.patientService.linkByPersonalNumber(
            command.userId,
            command.personalNumber,
        );
    }
}
