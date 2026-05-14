import {
    buildAvailabilityWindows,
    generateAvailableSlots,
} from '../../src/modules/schedules/domain/slot-generator';
import {
    ScheduleExceptionEntity,
    StaffScheduleEntity,
} from '../../src/modules/schedules/domain/schedule.entity';

const baseSchedule: StaffScheduleEntity = {
    id: 'schedule-1',
    staffProfileId: 'staff-1',
    departmentId: 'department-1',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '12:00',
    slotDurationMinutes: 30,
    breakStart: null,
    breakEnd: null,
    validFrom: null,
    validTo: null,
    isActive: true,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
};

function createException(
    overrides: Partial<ScheduleExceptionEntity>,
): ScheduleExceptionEntity {
    return {
        id: 'exception-1',
        staffProfileId: 'staff-1',
        departmentId: 'department-1',
        exceptionDate: new Date('2026-05-18T00:00:00.000Z'),
        startTime: null,
        endTime: null,
        isUnavailable: true,
        reason: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        ...overrides,
    };
}

describe('slot generation', () => {
    const date = '2026-05-18';

    it('skips slots that overlap a schedule break', () => {
        const windows = buildAvailabilityWindows(
            [
                {
                    ...baseSchedule,
                    breakStart: '10:00',
                    breakEnd: '10:30',
                },
            ],
            [],
            new Date(`${date}T00:00:00.000Z`),
        );

        const slots = generateAvailableSlots({
            date,
            windows,
            serviceDurationMinutes: 30,
            unavailableExceptions: [],
            bookedAppointments: [],
            lockedSlots: [],
        });

        expect(slots.map((slot) => slot.startTime)).not.toContain('10:00');
        expect(slots.map((slot) => slot.startTime)).toEqual([
            '09:00',
            '09:30',
            '10:30',
            '11:00',
            '11:30',
        ]);
    });

    it('returns no slots for a full-day unavailable exception', () => {
        const windows = buildAvailabilityWindows(
            [baseSchedule],
            [createException({})],
            new Date(`${date}T00:00:00.000Z`),
        );

        const slots = generateAvailableSlots({
            date,
            windows,
            serviceDurationMinutes: 30,
            unavailableExceptions: [createException({})],
            bookedAppointments: [],
            lockedSlots: [],
        });

        expect(slots).toEqual([]);
    });

    it('returns no slots when every generated slot is already booked', () => {
        const windows = buildAvailabilityWindows(
            [
                {
                    ...baseSchedule,
                    startTime: '09:00',
                    endTime: '10:00',
                },
            ],
            [],
            new Date(`${date}T00:00:00.000Z`),
        );

        const slots = generateAvailableSlots({
            date,
            windows,
            serviceDurationMinutes: 30,
            unavailableExceptions: [],
            bookedAppointments: [
                {
                    scheduledAt: new Date(`${date}T09:00:00.000Z`),
                    endAt: new Date(`${date}T10:00:00.000Z`),
                },
            ],
            lockedSlots: [],
        });

        expect(slots).toEqual([]);
    });

    it('filters Redis-locked slots through the lock repository contract', () => {
        const windows = buildAvailabilityWindows(
            [
                {
                    ...baseSchedule,
                    startTime: '09:00',
                    endTime: '10:00',
                },
            ],
            [],
            new Date(`${date}T00:00:00.000Z`),
        );

        const slots = generateAvailableSlots({
            date,
            windows,
            serviceDurationMinutes: 30,
            unavailableExceptions: [],
            bookedAppointments: [],
            lockedSlots: [
                {
                    start: new Date(`${date}T09:30:00.000Z`),
                    end: new Date(`${date}T10:00:00.000Z`),
                },
            ],
        });

        expect(slots.map((slot) => slot.startTime)).toEqual(['09:00']);
    });
});
