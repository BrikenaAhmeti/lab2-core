import { ContactMessageView } from './contact.entity';

export type ContactEventType = 'ContactMessageSubmitted';

export interface ContactEventPayload {
    message: ContactMessageView;
    adminUserIds: string[];
}

export interface ContactEventPublisher {
    publish(type: ContactEventType, payload: ContactEventPayload): Promise<void>;
}
