import { ContactMessageView } from './contact.entity';

export type ContactEventType =
    | 'ContactMessageSubmitted'
    | 'ContactMessageReplied';

export interface ContactEventPayload {
    message: ContactMessageView;
    adminUserIds?: string[];
    replyText?: string;
    actorUserId?: string;
}

export interface ContactEventPublisher {
    publish(type: ContactEventType, payload: ContactEventPayload): Promise<void>;
}
