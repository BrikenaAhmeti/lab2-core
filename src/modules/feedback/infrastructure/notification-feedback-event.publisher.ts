import {
    HttpNotificationClient,
    NotificationClient,
    SendNotificationPayload,
} from '../../../shared/notifications/notification-client';
import {
    FeedbackEventPayload,
    FeedbackEventPublisher,
    FeedbackEventType,
} from '../domain/feedback-event.publisher';
import { FeedbackView } from '../domain/feedback.entity';

function patientLabel(feedback: FeedbackView) {
    return feedback.isAnonymous ? 'A patient' : feedback.patient.name;
}

export class NotificationFeedbackEventPublisher implements FeedbackEventPublisher {
    constructor(
        private readonly notificationClient: NotificationClient = new HttpNotificationClient(),
    ) {}

    async publish(
        type: FeedbackEventType,
        payload: FeedbackEventPayload,
    ): Promise<void> {
        const notifications = this.buildNotifications(type, payload.feedback);
        await Promise.all(
            notifications.map((notification) => this.notificationClient.send(notification)),
        );
    }

    private buildNotifications(
        type: FeedbackEventType,
        feedback: FeedbackView,
    ): SendNotificationPayload[] {
        const staffUserId = feedback.appointment?.staff?.userId;

        if (type !== 'FeedbackSubmitted' || !staffUserId) {
            return [];
        }

        return [
            {
                userId: staffUserId,
                type: 'feedback.submitted',
                title: 'New appointment feedback',
                message: `${patientLabel(feedback)} left a ${feedback.rating}/5 rating.`,
                link: `/doctor/feedback/${feedback.id}`,
                channels: ['in_app'],
            },
        ];
    }
}
