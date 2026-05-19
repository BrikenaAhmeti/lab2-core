import { QueryHandler } from '../../../../shared/core/buses/query-bus';
import { AppointmentService } from '../../services/appointment.service';
import { GetAppointmentByIdQuery } from '../queries/get-appointment-by-id.query';

export class GetAppointmentByIdHandler implements QueryHandler<GetAppointmentByIdQuery, unknown> {
    constructor(private readonly service: AppointmentService) { }

    execute(query: GetAppointmentByIdQuery) {
        return this.service.getAppointmentById(query.id);
    }
}
