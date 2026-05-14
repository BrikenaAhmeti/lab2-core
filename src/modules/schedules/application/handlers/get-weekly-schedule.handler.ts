import { ScheduleService } from '../../services/schedule.service';
import { GetWeeklyScheduleQuery } from '../queries/get-weekly-schedule.query';

export class GetWeeklyScheduleHandler {
    constructor(private readonly scheduleService: ScheduleService) { }

    execute(query: GetWeeklyScheduleQuery) {
        return this.scheduleService.getWeeklySchedule(query.staffProfileId);
    }
}
