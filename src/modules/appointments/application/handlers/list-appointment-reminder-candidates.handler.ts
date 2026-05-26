import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { AppointmentView } from '../../domain/appointment.entity';
import { AppointmentService } from '../../services/appointment.service';
import { ListAppointmentReminderCandidatesQuery } from '../queries/list-appointment-reminder-candidates.query';

export class ListAppointmentReminderCandidatesHandler
implements QueryHandler<ListAppointmentReminderCandidatesQuery, AppointmentView[]> {
    constructor(private readonly appointmentService: AppointmentService) {}

    execute(query: ListAppointmentReminderCandidatesQuery) {
        return this.appointmentService.listReminderCandidates(query.from, query.to);
    }
}
