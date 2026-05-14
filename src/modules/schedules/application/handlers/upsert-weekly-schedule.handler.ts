import { UpsertWeeklyScheduleCommand } from '../commands/upsert-weekly-schedule.command';
import { ScheduleService } from '../../services/schedule.service';

export class UpsertWeeklyScheduleHandler {
    constructor(private readonly scheduleService: ScheduleService) { }

    execute(command: UpsertWeeklyScheduleCommand) {
        return this.scheduleService.upsertWeeklySchedule(
            command.staffProfileId,
            command.days,
            command.actorUserId,
        );
    }
}
