import { createClient } from 'redis';
import { env } from '../../../config/env';
import { LockedSlot } from '../../schedules/domain/slot-lock.repository';
import {
    AppointmentSlotLockInput,
    AppointmentSlotLockRepository,
} from '../domain/appointment-slot-lock.repository';

interface StoredSlotLock {
    staffProfileId: string;
    serviceId: string;
    start: Date;
    end: Date;
    token: string;
    expiresAt: number;
}

function lockKey(staffProfileId: string, scheduledAt: Date) {
    return `slot_lock:${staffProfileId}:${scheduledAt.toISOString()}`;
}

function parseStoredLock(value: string | null): StoredSlotLock | null {
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(value) as {
            staffProfileId: string;
            serviceId: string;
            start: string;
            end: string;
            token: string;
            expiresAt: number;
        };

        return {
            ...parsed,
            start: new Date(parsed.start),
            end: new Date(parsed.end),
        };
    } catch {
        return null;
    }
}

function isSameDate(start: Date, date: string) {
    return start.toISOString().slice(0, 10) === date;
}

export class InMemoryAppointmentSlotLockRepository implements AppointmentSlotLockRepository {
    private readonly locks = new Map<string, StoredSlotLock>();

    async acquireSlotLock(input: AppointmentSlotLockInput): Promise<boolean> {
        this.removeExpiredLocks();
        const key = lockKey(input.staffProfileId, input.scheduledAt);

        if (this.locks.has(key)) {
            return false;
        }

        this.locks.set(key, {
            staffProfileId: input.staffProfileId,
            serviceId: input.serviceId,
            start: input.scheduledAt,
            end: input.endAt,
            token: input.token,
            expiresAt: Date.now() + (input.ttlSeconds ?? 300) * 1000,
        });

        return true;
    }

    async releaseSlotLock(input: Pick<AppointmentSlotLockInput, 'staffProfileId' | 'scheduledAt' | 'token'>): Promise<void> {
        const key = lockKey(input.staffProfileId, input.scheduledAt);
        const lock = this.locks.get(key);

        if (lock?.token === input.token) {
            this.locks.delete(key);
        }
    }

    async findLockedSlots(filters: {
        staffProfileId: string;
        serviceId: string;
        date: string;
    }): Promise<LockedSlot[]> {
        this.removeExpiredLocks();

        return Array.from(this.locks.values())
            .filter(
                (lock) =>
                    lock.staffProfileId === filters.staffProfileId &&
                    isSameDate(lock.start, filters.date),
            )
            .map((lock) => ({
                start: lock.start,
                end: lock.end,
            }));
    }

    private removeExpiredLocks() {
        const now = Date.now();

        for (const [key, lock] of this.locks) {
            if (lock.expiresAt <= now) {
                this.locks.delete(key);
            }
        }
    }
}

export class RedisAppointmentSlotLockRepository implements AppointmentSlotLockRepository {
    private readonly fallback = new InMemoryAppointmentSlotLockRepository();
    private readonly client = createClient({ url: env.redisUrl });
    private connectPromise: Promise<unknown> | null = null;
    private redisUnavailable = false;

    constructor() {
        this.client.on('error', () => {
            this.redisUnavailable = true;
        });
    }

    async acquireSlotLock(input: AppointmentSlotLockInput): Promise<boolean> {
        const client = await this.getClient();

        if (!client) {
            return this.fallback.acquireSlotLock(input);
        }

        const value = JSON.stringify({
            staffProfileId: input.staffProfileId,
            serviceId: input.serviceId,
            start: input.scheduledAt.toISOString(),
            end: input.endAt.toISOString(),
            token: input.token,
            expiresAt: Date.now() + (input.ttlSeconds ?? 300) * 1000,
        });
        const result = await client.set(lockKey(input.staffProfileId, input.scheduledAt), value, {
            NX: true,
            EX: input.ttlSeconds ?? 300,
        });

        return result === 'OK';
    }

    async releaseSlotLock(input: Pick<AppointmentSlotLockInput, 'staffProfileId' | 'scheduledAt' | 'token'>): Promise<void> {
        const client = await this.getClient();

        if (!client) {
            return this.fallback.releaseSlotLock(input);
        }

        const key = lockKey(input.staffProfileId, input.scheduledAt);
        const lock = parseStoredLock(await client.get(key));

        if (lock?.token === input.token) {
            await client.del(key);
        }
    }

    async findLockedSlots(filters: {
        staffProfileId: string;
        serviceId: string;
        date: string;
    }): Promise<LockedSlot[]> {
        const client = await this.getClient();

        if (!client) {
            return this.fallback.findLockedSlots(filters);
        }

        const keys = client.scanIterator({
            MATCH: `slot_lock:${filters.staffProfileId}:*`,
            COUNT: 100,
        });
        const slots: LockedSlot[] = [];

        for await (const key of keys) {
            const lock = parseStoredLock(await client.get(String(key)));

            if (lock && isSameDate(lock.start, filters.date)) {
                slots.push({
                    start: lock.start,
                    end: lock.end,
                });
            }
        }

        return slots;
    }

    private async getClient() {
        if (!env.redisUrl || this.redisUnavailable) {
            return null;
        }

        if (this.client.isOpen) {
            return this.client;
        }

        try {
            this.connectPromise ??= this.client.connect();
            await this.connectPromise;

            return this.client;
        } catch {
            this.redisUnavailable = true;
            return null;
        }
    }
}

let sharedRepository: AppointmentSlotLockRepository | null = null;

export function createAppointmentSlotLockRepository() {
    if (!sharedRepository) {
        sharedRepository =
            env.redisUrl && env.nodeEnv !== 'test'
                ? new RedisAppointmentSlotLockRepository()
                : new InMemoryAppointmentSlotLockRepository();
    }

    return sharedRepository;
}
