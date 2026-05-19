import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { AppointmentView } from '../../domain/appointment.entity';
import { AppointmentService } from '../../services/appointment.service';
import { UpdateAppointmentStatusCommand } from '../commands/update-appointment-status.command';

export class UpdateAppointmentStatusHandler implements CommandHandler<UpdateAppointmentStatusCommand, AppointmentView> {
    constructor(private readonly service: AppointmentService) { }

    execute(command: UpdateAppointmentStatusCommand) {
        return this.service.updateAppointmentStatus(command.id, {
            status: command.status,
            reason: command.reason,
            actorUserId: command.actorUserId,
        });
    }
}
