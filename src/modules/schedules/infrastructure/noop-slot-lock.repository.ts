import { LockedSlot, SlotLockRepository } from '../domain/slot-lock.repository';

export class NoopSlotLockRepository implements SlotLockRepository {
    async findLockedSlots(): Promise<LockedSlot[]> {
        return [];
    }
}
