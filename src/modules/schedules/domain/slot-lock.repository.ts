export interface LockedSlot {
    start: Date;
    end: Date;
}

export interface SlotLockRepository {
    findLockedSlots(filters: {
        staffProfileId: string;
        serviceId: string;
        date: string;
    }): Promise<LockedSlot[]>;
}
