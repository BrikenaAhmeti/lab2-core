const WEEKDAYS = new Map([
    ['sunday', 0],
    ['sun', 0],
    ['monday', 1],
    ['mon', 1],
    ['tuesday', 2],
    ['tue', 2],
    ['wednesday', 3],
    ['wed', 3],
    ['thursday', 4],
    ['thu', 4],
    ['friday', 5],
    ['fri', 5],
    ['saturday', 6],
    ['sat', 6],
]);

const DEFAULT_TIME_ZONE = 'Europe/Belgrade';

export interface ParsedAppointmentStartTime {
    value: Date;
    instant: Date;
    dateOnly: string;
    time: string;
    exactStartTime: string;
}

export function getAppointmentTimeZone() {
    return process.env.APPOINTMENT_TIME_ZONE || DEFAULT_TIME_ZONE;
}

export function toDateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
}

export function startOfUtcDay(date: Date) {
    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
    ));
}

export function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

export function normalizeDateInput(
    value: string,
    now = new Date(),
    timeZone = getAppointmentTimeZone(),
): string | null {
    const raw = value.trim();

    if (!raw) return null;

    const lower = raw.toLowerCase();
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

    if (isoDate) {
        return validDateOnly(`${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`);
    }

    const slashDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);

    if (slashDate) {
        const month = slashDate[1].padStart(2, '0');
        const day = slashDate[2].padStart(2, '0');

        return validDateOnly(`${slashDate[3]}-${month}-${day}`);
    }

    const base = startOfUtcDay(
        new Date(`${dateOnlyInTimeZone(now, timeZone)}T00:00:00.000Z`),
    );

    if (lower === 'today') return toDateOnly(base);
    if (lower === 'tomorrow') return toDateOnly(addDays(base, 1));
    if (lower === 'day after tomorrow') return toDateOnly(addDays(base, 2));

    const weekdayMatch = /^(next\s+)?([a-z]+)$/.exec(lower);
    const weekday = weekdayMatch ? WEEKDAYS.get(weekdayMatch[2]) : undefined;

    if (weekday !== undefined) {
        const today = base.getUTCDay();
        let daysUntil = (weekday - today + 7) % 7;

        if (daysUntil === 0 || weekdayMatch?.[1]) {
            daysUntil += 7;
        }

        return toDateOnly(addDays(base, daysUntil));
    }

    const parsed = new Date(raw);

    if (!Number.isNaN(parsed.getTime())) {
        return validDateOnly(toDateOnly(parsed));
    }

    return null;
}

export function parseDateOfBirth(value?: string): Date | null {
    if (!value) return null;

    const normalized = normalizeDateInput(value, new Date('2000-01-01T00:00:00.000Z'));

    return normalized ? new Date(`${normalized}T00:00:00.000Z`) : null;
}

export function parseAppointmentStartTime(
    value: string,
    timeZone = getAppointmentTimeZone(),
): ParsedAppointmentStartTime | null {
    const raw = value.trim();
    const match =
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?([+-]\d{2}:\d{2})$/.exec(raw);

    if (!match) {
        return null;
    }

    const dateOnly = validDateOnly(`${match[1]}-${match[2]}-${match[3]}`);

    if (!dateOnly) {
        return null;
    }

    const hours = Number(match[4]);
    const minutes = Number(match[5]);
    const seconds = Number(match[6] ?? '0');

    if (hours > 23 || minutes > 59 || seconds > 59) {
        return null;
    }

    const expectedOffset = getTimeZoneOffset(dateOnly, timeZone);

    if (match[7] !== expectedOffset) {
        return null;
    }

    const wallClockDate = new Date(Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        hours,
        minutes,
        seconds,
        0,
    ));

    if (Number.isNaN(wallClockDate.getTime())) {
        return null;
    }

    const time = `${match[4]}:${match[5]}`;
    const exactStartTime = formatClinicDateTime(wallClockDate, timeZone);
    const instant = new Date(
        `${dateOnly}T${time}:${seconds.toString().padStart(2, '0')}${match[7]}`,
    );

    if (Number.isNaN(instant.getTime())) {
        return null;
    }

    return {
        value: wallClockDate,
        instant,
        dateOnly,
        time,
        exactStartTime,
    };
}

export function minutesFromUtcClock(date: Date) {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function preferredTimeToMinutes(value?: string) {
    if (!value) return null;

    const normalized = value.trim().toLowerCase();

    if (!normalized) return null;
    if (normalized.includes('morning')) return 9 * 60;
    if (normalized.includes('afternoon')) return 13 * 60;
    if (normalized.includes('evening')) return 17 * 60;

    const timeMatch = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(normalized);

    if (!timeMatch) return null;

    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2] ?? '0');

    if (minutes > 59) return null;

    if (timeMatch[3] === 'pm' && hours < 12) {
        hours += 12;
    }

    if (timeMatch[3] === 'am' && hours === 12) {
        hours = 0;
    }

    if (hours > 23) return null;

    return hours * 60 + minutes;
}

export function formatClinicDateTime(
    value: Date,
    timeZone = getAppointmentTimeZone(),
) {
    const dateOnly = toDateOnly(value);
    const offset = getTimeZoneOffset(dateOnly, timeZone);
    const date = [
        value.getUTCFullYear().toString().padStart(4, '0'),
        (value.getUTCMonth() + 1).toString().padStart(2, '0'),
        value.getUTCDate().toString().padStart(2, '0'),
    ].join('-');
    const time = [
        value.getUTCHours().toString().padStart(2, '0'),
        value.getUTCMinutes().toString().padStart(2, '0'),
        value.getUTCSeconds().toString().padStart(2, '0'),
    ].join(':');

    return `${date}T${time}${offset}`;
}

export function clinicIsoDateTimeToInstant(value: string) {
    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateOnlyInTimeZone(value: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(value);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
        return toDateOnly(value);
    }

    return `${year}-${month}-${day}`;
}

function validDateOnly(value: string) {
    const parsed = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return toDateOnly(parsed) === value ? value : null;
}

export function getTimeZoneOffset(dateOnly: string, timeZone: string) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            timeZoneName: 'shortOffset',
            hour: '2-digit',
            minute: '2-digit',
        }).formatToParts(new Date(`${dateOnly}T12:00:00.000Z`));
        const zone = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
        const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone);

        if (!match) {
            return '+00:00';
        }

        return `${match[1]}${match[2].padStart(2, '0')}:${match[3] ?? '00'}`;
    } catch {
        return '+00:00';
    }
}
