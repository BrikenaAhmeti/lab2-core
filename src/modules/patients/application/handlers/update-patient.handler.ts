import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { PatientEntity } from '../../domain/patient.entity';
import { PatientService } from '../../services/patient.service';
import { UpdatePatientCommand } from '../commands/update-patient.command';

export class UpdatePatientHandler
    implements CommandHandler<UpdatePatientCommand, PatientEntity>
{
    constructor(private readonly patientService: PatientService) {}

    execute(command: UpdatePatientCommand) {
        return this.patientService.updatePatient(command.id, {
            firstName: command.firstName,
            lastName: command.lastName,
            userId: command.userId,
            email: command.email,
            phone: command.phone,
            dateOfBirth: command.dateOfBirth,
            gender: command.gender,
            bloodType: command.bloodType,
            personalNumber: command.personalNumber,
            address: command.address,
            emergencyContact: command.emergencyContact,
            emergencyPhone: command.emergencyPhone,
            allergies: command.allergies,
            medicalNotes: command.medicalNotes,
            isActive: command.isActive,
            actorUserId: command.actorUserId,
        }, command.actorUserId, command.canUpdateAll);
    }
}
