import { PrescriptionView } from './prescription.entity';

export type PrescriptionEventType = 'PrescriptionCreated';

export interface PrescriptionEventPayload {
    prescription: PrescriptionView;
    actorUserId?: string;
}

export interface PrescriptionEventPublisher {
    publish(
        type: PrescriptionEventType,
        payload: PrescriptionEventPayload,
    ): Promise<void>;
}
