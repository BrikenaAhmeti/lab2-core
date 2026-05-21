import { CommandHandler } from '../../../../shared/core/buses/command-bus';
import { LabOrderView } from '../../domain/lab.entity';
import { LabService } from '../../services/lab.service';
import { ReviewLabOrderCommand } from '../commands/review-lab-order.command';

export class ReviewLabOrderHandler
    implements CommandHandler<ReviewLabOrderCommand, LabOrderView> {
    constructor(private readonly labService: LabService) {}

    execute(command: ReviewLabOrderCommand) {
        return this.labService.reviewLabOrder(command.id, {
            notes: command.notes,
            actorUserId: command.actorUserId,
        });
    }
}
