import { DeleteScheduleExceptionCommand } from '../commands/delete-schedule-exception.command';
import { ScheduleService } from '../../services/schedule.service';

export class DeleteScheduleExceptionHandler {
    constructor(private readonly scheduleService: ScheduleService) { }

    execute(command: DeleteScheduleExceptionCommand) {
        return this.scheduleService.deleteException(
            command.staffProfileId,
            command.exceptionId,
        );
    }
}
