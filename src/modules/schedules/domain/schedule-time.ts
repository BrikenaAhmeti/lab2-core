const DEFAULT_TIME_ZONE = 'Europe/Belgrade';

export function getScheduleTimeZone() {
    return process.env.APPOINTMENT_TIME_ZONE || DEFAULT_TIME_ZONE;
}

export function toScheduleClockDate(
    value: Date,
    timeZone = getScheduleTimeZone(),
) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(value);

    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
    const year = part('year');
    const month = part('month');
    const day = part('day');
    const hour = part('hour');
    const minute = part('minute');
    const second = part('second');

    if ([year, month, day, hour, minute, second].some(Number.isNaN)) {
        return value;
    }

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0));
}

export function isFutureScheduleClockDate(
    value: Date,
    now = new Date(),
    timeZone = getScheduleTimeZone(),
) {
    return value.getTime() > toScheduleClockDate(now, timeZone).getTime();
}
