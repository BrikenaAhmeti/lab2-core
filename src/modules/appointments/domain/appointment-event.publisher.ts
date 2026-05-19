import { AppointmentView } from './appointment.entity';

export type AppointmentEventType =
    | 'AppointmentBooked'
    | 'AppointmentRescheduled'
    | 'AppointmentStatusChanged'
    | 'AppointmentCancelled';

export interface AppointmentEventPayload {
    appointment: AppointmentView;
    actorUserId?: string;
    previousScheduledAt?: Date;
    previousEndAt?: Date;
    previousStatus?: string;
}

export interface AppointmentEventPublisher {
    publish(type: AppointmentEventType, payload: AppointmentEventPayload): Promise<void>;
}
