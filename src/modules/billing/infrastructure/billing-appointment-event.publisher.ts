import {
    AppointmentEventPayload,
    AppointmentEventPublisher,
    AppointmentEventType,
} from '../../appointments/domain/appointment-event.publisher';
import { BillingPrismaRepository } from './billing.prisma.repository';
import { BillingService } from '../services/billing.service';

export class BillingAppointmentEventPublisher implements AppointmentEventPublisher {
    constructor(
        private readonly billingService = new BillingService(
            new BillingPrismaRepository(),
        ),
    ) {}

    async publish(
        type: AppointmentEventType,
        payload: AppointmentEventPayload,
    ): Promise<void> {
        if (type !== 'AppointmentCompleted') {
            return;
        }

        await this.billingService.autoGenerateFromAppointment(
            payload.appointment.id,
            payload.actorUserId,
        );
    }
}
