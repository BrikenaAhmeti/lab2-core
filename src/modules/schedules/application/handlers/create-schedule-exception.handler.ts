import { CreateScheduleExceptionCommand } from '../commands/create-schedule-exception.command';
import { ScheduleService } from '../../services/schedule.service';

export class CreateScheduleExceptionHandler {
    constructor(private readonly scheduleService: ScheduleService) { }

    execute(command: CreateScheduleExceptionCommand) {
        return this.scheduleService.createException(command.staffProfileId, {
            departmentId: command.departmentId,
            exceptionDate: command.exceptionDate,
            startTime: command.startTime,
            endTime: command.endTime,
            isUnavailable: command.isUnavailable,
            reason: command.reason,
            actorUserId: command.actorUserId,
        });
    }
}
