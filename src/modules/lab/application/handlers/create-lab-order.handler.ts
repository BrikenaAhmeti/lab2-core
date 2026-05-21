import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { LabOrderView } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { CreateLabOrderCommand } from '../commands/create-lab-order.command';

export class CreateLabOrderHandler
    implements CommandHandler<CreateLabOrderCommand, LabOrderView> {
    constructor(private readonly labService: LabService) {}

    execute(command: CreateLabOrderCommand) {
        return this.labService.createLabOrder({
            patientId: command.patientId,
            appointmentId: command.appointmentId,
            medicalRecordId: command.medicalRecordId,
            orderedByStaffId: command.orderedByStaffId,
            priority: command.priority,
            notes: command.notes,
            tests: command.tests,
            actorUserId: command.actorUserId,
        });
    }
}
