import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { PatientService } from '../../../patients/services/patient.service';
import { AppointmentView } from '../../domain/appointment.entity';
import { AppointmentService } from '../../services/appointment.service';
import { BookPublicAppointmentCommand } from '../commands/book-public-appointment.command';

export class BookPublicAppointmentHandler
    implements CommandHandler<BookPublicAppointmentCommand, AppointmentView>
{
    constructor(
        private readonly appointmentService: AppointmentService,
        private readonly patientService: PatientService,
    ) { }

    async execute(command: BookPublicAppointmentCommand) {
        const patient = await this.patientService.findOrCreatePublicPatient(
            command.patient,
        );

        return this.appointmentService.bookAppointment({
            patientId: patient.id,
            serviceCatalogId: command.serviceCatalogId,
            staffProfileId: command.staffProfileId,
            scheduledAt: command.scheduledAt,
            appointmentType: command.appointmentType,
            notes: command.notes,
        });
    }
}
