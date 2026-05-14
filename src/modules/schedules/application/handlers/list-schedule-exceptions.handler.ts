import { ScheduleService } from '../../services/schedule.service';
import { ListScheduleExceptionsQuery } from '../queries/list-schedule-exceptions.query';

export class ListScheduleExceptionsHandler {
    constructor(private readonly scheduleService: ScheduleService) { }

    execute(query: ListScheduleExceptionsQuery) {
        return this.scheduleService.listExceptions({
            staffProfileId: query.staffProfileId,
            from: query.from,
            to: query.to,
        });
    }
}
