import {
    NotificationClient,
    SendNotificationPayload,
    HttpNotificationClient,
} from '../../../shared/notifications/notification-client';
import {
    AppointmentEventPayload,
    AppointmentEventPublisher,
    AppointmentEventType,
} from '../domain/appointment-event.publisher';
import { AppointmentView } from '../domain/appointment.entity';

function formatDateTime(value: Date) {
    return `${value.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function patientLink(_appointmentId: string) {
    return '/patient/appointments';
}

function staffLink(appointmentId: string) {
    return `/doctor/consultations/${appointmentId}`;
}

function appointmentLabel(appointment: AppointmentView) {
    return `${appointment.service.name} in ${appointment.department.name} on ${formatDateTime(
        appointment.scheduledAt,
    )}`;
}

export class NotificationAppointmentEventPublisher implements AppointmentEventPublisher {
    constructor(
        private readonly notificationClient: NotificationClient = new HttpNotificationClient(),
    ) {}

    async publish(
        type: AppointmentEventType,
        payload: AppointmentEventPayload,
    ): Promise<void> {
        const notifications = this.buildNotifications(type, payload);
        await Promise.all(
            notifications.map((notification) => this.notificationClient.send(notification)),
        );
    }

    private buildNotifications(
        type: AppointmentEventType,
        payload: AppointmentEventPayload,
    ): SendNotificationPayload[] {
        const { appointment } = payload;

        if (type === 'AppointmentBooked') {
            return this.forPatientAndStaff(appointment, {
                type: 'appointment.booked',
                patientTitle: 'Appointment booked',
                staffTitle: 'New appointment booked',
                message: `Appointment booked: ${appointmentLabel(appointment)}.`,
                channels: ['in_app', 'email'],
            });
        }

        if (type === 'AppointmentRescheduled') {
            return this.forPatientAndStaff(appointment, {
                type: 'appointment.rescheduled',
                patientTitle: 'Appointment rescheduled',
                staffTitle: 'Appointment rescheduled',
                message: `Appointment rescheduled to ${appointmentLabel(appointment)}.`,
                channels: ['in_app', 'email'],
            });
        }

        if (type === 'AppointmentCancelled') {
            const input = {
                type: 'appointment.cancelled',
                patientTitle: 'Appointment cancelled',
                staffTitle: 'Appointment cancelled',
                message: `Appointment cancelled: ${appointmentLabel(appointment)}.`,
                channels: ['in_app', 'email'] as SendNotificationPayload['channels'],
            };

            if (payload.actorUserId && appointment.patient.userId === payload.actorUserId) {
                return this.forStaff(appointment, {
                    type: input.type,
                    title: input.staffTitle,
                    message: input.message,
                    channels: input.channels,
                });
            }

            if (payload.actorUserId && appointment.staff?.userId === payload.actorUserId) {
                return this.forPatient(appointment, {
                    type: input.type,
                    title: input.patientTitle,
                    message: input.message,
                    channels: input.channels,
                });
            }

            return this.forPatientAndStaff(appointment, input);
        }

        if (type === 'AppointmentStatusChanged' && appointment.status === 'CONFIRMED') {
            return this.forPatient(appointment, {
                type: 'appointment.confirmed',
                title: 'Appointment confirmed',
                message: `Your appointment is confirmed: ${appointmentLabel(appointment)}.`,
                channels: ['in_app', 'email'],
            });
        }

        if (type === 'AppointmentStatusChanged' && appointment.status === 'NO_SHOW') {
            return this.forPatient(appointment, {
                type: 'appointment.no_show',
                title: 'No-show recorded',
                message: `A no-show was recorded for ${appointmentLabel(appointment)}.`,
                channels: ['in_app', 'email'],
            });
        }

        if (type === 'AppointmentCompleted') {
            return this.forPatient(appointment, {
                type: 'appointment.completed_report',
                title: 'Consultation report ready',
                message: `Your consultation report for ${appointmentLabel(appointment)} is ready to view in your portal.`,
                link: '/patient/medical-records',
                channels: ['in_app', 'email'],
            });
        }

        return [];
    }

    private forPatientAndStaff(
        appointment: AppointmentView,
        input: {
            type: string;
            patientTitle: string;
            staffTitle: string;
            message: string;
            channels: SendNotificationPayload['channels'];
        },
    ) {
        return [
            ...this.forPatient(appointment, {
                type: input.type,
                title: input.patientTitle,
                message: input.message,
                channels: input.channels,
            }),
            ...this.forStaff(appointment, {
                type: input.type,
                title: input.staffTitle,
                message: input.message,
                channels: input.channels,
            }),
        ];
    }

    private forPatient(
        appointment: AppointmentView,
        input: {
            type: string;
            title: string;
            message: string;
            link?: string | null;
            channels: SendNotificationPayload['channels'];
        },
    ): SendNotificationPayload[] {
        if (!appointment.patient.userId) {
            return [];
        }

        return [
            {
                userId: appointment.patient.userId,
                type: input.type,
                title: input.title,
                message: input.message,
                link: input.link ?? patientLink(appointment.id),
                channels: input.channels,
                recipientEmail: appointment.patient.email,
            },
        ];
    }

    private forStaff(
        appointment: AppointmentView,
        input: {
            type: string;
            title: string;
            message: string;
            channels: SendNotificationPayload['channels'];
        },
    ): SendNotificationPayload[] {
        if (!appointment.staff?.userId) {
            return [];
        }

        return [
            {
                userId: appointment.staff.userId,
                type: input.type,
                title: input.title,
                message: input.message,
                link: staffLink(appointment.id),
                channels: input.channels,
            },
        ];
    }
}
