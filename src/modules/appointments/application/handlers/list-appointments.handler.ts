import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { AppointmentService } from '../../services/appointment.service';
import { ListAppointmentsQuery } from '../queries/list-appointments.query';

export class ListAppointmentsHandler implements QueryHandler<ListAppointmentsQuery, unknown> {
    constructor(private readonly service: AppointmentService) { }

    execute(query: ListAppointmentsQuery) {
        return this.service.listAppointments({
            page: query.page,
            limit: query.limit,
            date: query.date,
            from: query.from,
            to: query.to,
            staffId: query.staffId,
            patientId: query.patientId,
            departmentId: query.departmentId,
            status: query.status,
            hasNoFeedback: query.hasNoFeedback,
        });
    }
}
