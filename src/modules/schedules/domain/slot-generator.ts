import {
    AvailableSlotView,
    BookedAppointmentSlot,
    ScheduleExceptionEntity,
    StaffScheduleEntity,
} from './schedule.entity';
import { LockedSlot } from './slot-lock.repository';

export interface AvailabilityWindow {
    startMinutes: number;
    endMinutes: number;
    breakStartMinutes?: number;
    breakEndMinutes?: number;
    slotDurationMinutes: number;
}

export const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseTimeToMinutes(time: string) {
    const match = TIME_PATTERN.exec(time);

    if (!match) {
        return null;
    }

    return Number(match[1]) * 60 + Number(match[2]);
}

export function formatMinutesAsTime(minutes: number) {
    const hours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');

    return `${hours}:${mins}`;
}

export function dateOnlyToUtcDate(date: string) {
    return new Date(`${date}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

export function toUtcDateTime(date: string, minutes: number) {
    const value = dateOnlyToUtcDate(date);
    value.setUTCHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return value;
}

export function rangesOverlap(
    start: Date,
    end: Date,
    blockedStart: Date,
    blockedEnd: Date,
) {
    return start < blockedEnd && end > blockedStart;
}

function minutesRangesOverlap(
    startMinutes: number,
    endMinutes: number,
    blockedStartMinutes: number,
    blockedEndMinutes: number,
) {
    return startMinutes < blockedEndMinutes && endMinutes > blockedStartMinutes;
}

function scheduleIsValidForDate(schedule: StaffScheduleEntity, date: Date) {
    if (!schedule.isActive) {
        return false;
    }

    if (schedule.validFrom && date < schedule.validFrom) {
        return false;
    }

    if (schedule.validTo && date > schedule.validTo) {
        return false;
    }

    return true;
}

export function buildAvailabilityWindows(
    schedules: StaffScheduleEntity[],
    exceptions: ScheduleExceptionEntity[],
    date: Date,
): AvailabilityWindow[] {
    const wholeDayUnavailable = exceptions.some(
        (exception) =>
            exception.isUnavailable &&
            exception.startTime === null &&
            exception.endTime === null,
    );

    if (wholeDayUnavailable) {
        return [];
    }

    const specialHours = exceptions.filter(
        (exception) => !exception.isUnavailable && exception.startTime && exception.endTime,
    );

    if (specialHours.length > 0) {
        return specialHours.map((exception) => ({
            startMinutes: parseTimeToMinutes(exception.startTime!)!,
            endMinutes: parseTimeToMinutes(exception.endTime!)!,
            slotDurationMinutes: inferSlotDuration(schedules),
        }));
    }

    return schedules.filter((schedule) => scheduleIsValidForDate(schedule, date)).map((schedule) => ({
        startMinutes: parseTimeToMinutes(schedule.startTime)!,
        endMinutes: parseTimeToMinutes(schedule.endTime)!,
        breakStartMinutes: schedule.breakStart
            ? parseTimeToMinutes(schedule.breakStart) ?? undefined
            : undefined,
        breakEndMinutes: schedule.breakEnd
            ? parseTimeToMinutes(schedule.breakEnd) ?? undefined
            : undefined,
        slotDurationMinutes: schedule.slotDurationMinutes,
    }));
}

export function generateAvailableSlots(params: {
    date: string;
    windows: AvailabilityWindow[];
    serviceDurationMinutes: number;
    unavailableExceptions: ScheduleExceptionEntity[];
    bookedAppointments: BookedAppointmentSlot[];
    lockedSlots: LockedSlot[];
}): AvailableSlotView[] {
    const slots: AvailableSlotView[] = [];

    for (const window of params.windows) {
        for (
            let startMinutes = window.startMinutes;
            startMinutes + params.serviceDurationMinutes <= window.endMinutes;
            startMinutes += window.slotDurationMinutes
        ) {
            const endMinutes = startMinutes + params.serviceDurationMinutes;

            if (
                window.breakStartMinutes !== undefined &&
                window.breakEndMinutes !== undefined &&
                minutesRangesOverlap(
                    startMinutes,
                    endMinutes,
                    window.breakStartMinutes,
                    window.breakEndMinutes,
                )
            ) {
                continue;
            }

            const start = toUtcDateTime(params.date, startMinutes);
            const end = toUtcDateTime(params.date, endMinutes);

            if (
                conflictsWithUnavailableException(
                    startMinutes,
                    endMinutes,
                    params.unavailableExceptions,
                ) ||
                conflictsWithRange(start, end, params.bookedAppointments) ||
                conflictsWithRange(start, end, params.lockedSlots)
            ) {
                continue;
            }

            slots.push({
                start: start.toISOString(),
                end: end.toISOString(),
                startTime: formatMinutesAsTime(startMinutes),
                endTime: formatMinutesAsTime(endMinutes),
                durationMinutes: params.serviceDurationMinutes,
            });
        }
    }

    return slots;
}

function inferSlotDuration(schedules: StaffScheduleEntity[]) {
    return schedules[0]?.slotDurationMinutes ?? 30;
}

function conflictsWithUnavailableException(
    startMinutes: number,
    endMinutes: number,
    exceptions: ScheduleExceptionEntity[],
) {
    return exceptions.some((exception) => {
        if (!exception.isUnavailable || !exception.startTime || !exception.endTime) {
            return false;
        }

        return minutesRangesOverlap(
            startMinutes,
            endMinutes,
            parseTimeToMinutes(exception.startTime)!,
            parseTimeToMinutes(exception.endTime)!,
        );
    });
}

function conflictsWithRange(
    start: Date,
    end: Date,
    blockedRanges: Array<{ start: Date; end: Date } | BookedAppointmentSlot>,
) {
    return blockedRanges.some((range) => {
        const blockedStart = 'scheduledAt' in range ? range.scheduledAt : range.start;
        const blockedEnd = 'endAt' in range ? range.endAt : range.end;

        return rangesOverlap(start, end, blockedStart, blockedEnd);
    });
}
