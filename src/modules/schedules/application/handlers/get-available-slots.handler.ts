import { ScheduleService } from '../../services/schedule.service';
import { GetAvailableSlotsQuery } from '../queries/get-available-slots.query';

export class GetAvailableSlotsHandler {
    constructor(private readonly scheduleService: ScheduleService) { }

    execute(query: GetAvailableSlotsQuery) {
        return this.scheduleService.getAvailableSlots({
            staffProfileId: query.staffProfileId,
            serviceId: query.serviceId,
            date: query.date,
        });
    }
}
