import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { AppointmentView } from '../../domain/appointment.entity';
import { BookAppointmentCommand } from '../commands/book-appointment.command';
import { AppointmentService } from '../../services/appointment.service';

export class BookAppointmentHandler implements CommandHandler<BookAppointmentCommand, AppointmentView> {
    constructor(private readonly service: AppointmentService) { }

    execute(command: BookAppointmentCommand) {
        return this.service.bookAppointment({
            patientId: command.patientId,
            serviceCatalogId: command.serviceCatalogId,
            staffProfileId: command.staffProfileId,
            scheduledAt: command.scheduledAt,
            appointmentType: command.appointmentType,
            notes: command.notes,
            actorUserId: command.actorUserId,
        });
    }
}
