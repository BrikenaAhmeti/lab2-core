import { SlotLockRepository } from '../../schedules/domain/slot-lock.repository';

export interface AppointmentSlotLockInput {
    staffProfileId: string;
    serviceId: string;
    scheduledAt: Date;
    endAt: Date;
    token: string;
    ttlSeconds?: number;
}

export interface AppointmentSlotLockRepository extends SlotLockRepository {
    acquireSlotLock(input: AppointmentSlotLockInput): Promise<boolean>;
    releaseSlotLock(input: Pick<AppointmentSlotLockInput, 'staffProfileId' | 'scheduledAt' | 'token'>): Promise<void>;
}
