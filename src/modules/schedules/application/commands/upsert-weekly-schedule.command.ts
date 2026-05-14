import { WeeklyScheduleDayInput } from '../../services/schedule.service';

export class UpsertWeeklyScheduleCommand {
    constructor(
        public readonly staffProfileId: string,
        public readonly days: WeeklyScheduleDayInput[],
        public readonly actorUserId?: string,
    ) { }
}
