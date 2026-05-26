import { env } from '../../config/env';

export type NotificationChannel = 'in_app' | 'email';

export interface SendNotificationPayload {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    channels: NotificationChannel[];
    recipientEmail?: string | null;
    dedupeByTypeAndLink?: boolean;
}

export interface NotificationClient {
    send(payload: SendNotificationPayload): Promise<void>;
}

export class HttpNotificationClient implements NotificationClient {
    constructor(
        private readonly baseUrl = env.notificationServiceUrl,
        private readonly internalApiKey = env.internalApiKey,
    ) {}

    async send(payload: SendNotificationPayload): Promise<void> {
        if (!this.baseUrl || !this.internalApiKey) {
            return;
        }

        const response = await fetch(
            new URL('/internal/notifications/send', this.baseUrl),
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-internal-api-key': this.internalApiKey,
                },
                body: JSON.stringify(payload),
            },
        );

        if (!response.ok) {
            throw new Error(`Notification service returned ${response.status}`);
        }
    }
}
