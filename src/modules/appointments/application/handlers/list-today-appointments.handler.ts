import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { AppointmentService } from '../../services/appointment.service';
import { ListTodayAppointmentsQuery } from '../queries/list-today-appointments.query';

export class ListTodayAppointmentsHandler implements QueryHandler<ListTodayAppointmentsQuery, unknown> {
    constructor(private readonly service: AppointmentService) { }

    execute(query: ListTodayAppointmentsQuery) {
        return this.service.listTodayAppointments(query.now);
    }
}
