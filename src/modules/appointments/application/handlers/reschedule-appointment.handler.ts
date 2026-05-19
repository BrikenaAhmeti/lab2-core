import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { AppointmentView } from '../../domain/appointment.entity';
import { AppointmentService } from '../../services/appointment.service';
import { RescheduleAppointmentCommand } from '../commands/reschedule-appointment.command';

export class RescheduleAppointmentHandler implements CommandHandler<RescheduleAppointmentCommand, AppointmentView> {
    constructor(private readonly service: AppointmentService) { }

    execute(command: RescheduleAppointmentCommand) {
        return this.service.rescheduleAppointment(command.id, {
            scheduledAt: command.scheduledAt,
            serviceCatalogId: command.serviceCatalogId,
            staffProfileId: command.staffProfileId,
            appointmentType: command.appointmentType,
            notes: command.notes,
            actorUserId: command.actorUserId,
        });
    }
}
