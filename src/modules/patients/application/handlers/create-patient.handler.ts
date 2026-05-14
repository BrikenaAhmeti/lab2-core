import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { PatientEntity } from '../../domain/patient.entity';
import { PatientService } from '../../services/patient.service';
import { CreatePatientCommand } from '../commands/create-patient.command';

export class CreatePatientHandler
    implements CommandHandler<CreatePatientCommand, PatientEntity>
{
    constructor(private readonly patientService: PatientService) {}

    execute(command: CreatePatientCommand) {
        return this.patientService.createPatient({
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
            actorUserId: command.actorUserId,
            canCreateAll: command.canCreateAll,
        });
    }
}
