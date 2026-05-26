import { FeedbackView } from './feedback.entity';

export type FeedbackEventType = 'FeedbackSubmitted';

export interface FeedbackEventPayload {
    feedback: FeedbackView;
    actorUserId?: string;
}

export interface FeedbackEventPublisher {
    publish(
        type: FeedbackEventType,
        payload: FeedbackEventPayload,
    ): Promise<void>;
}
