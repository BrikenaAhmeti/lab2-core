import { AppError } from '../../../shared/core/errors/app-error';
import {
    AvailableSlotsView,
    ScheduleExceptionEntity,
    WeeklyScheduleView,
} from '../domain/schedule.entity';
import {
    CreateScheduleExceptionData,
    ScheduleRepository,
    UpsertScheduleDayData,
} from '../domain/schedule.repository';
import { SlotLockRepository } from '../domain/slot-lock.repository';
import {
    AvailabilityWindow,
    addDays,
    dateOnlyToUtcDate,
    generateAvailableSlots,
    parseTimeToMinutes,
} from '../domain/slot-generator';
import { isFutureScheduleClockDate } from '../domain/schedule-time';

const DEFAULT_SCHEDULE_START_MINUTES = 8 * 60;
const DEFAULT_SCHEDULE_END_MINUTES = 17 * 60;
const DEFAULT_SCHEDULE_SLOT_DURATION_MINUTES = 30;

function toDateOnly(date: Date) {
    return date.toISOString().slice(0, 10);
}

function isWeekend(date: Date) {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
}

export interface WeeklyScheduleDayInput {
    dayOfWeek: number;
    isActive: boolean;
    departmentId?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    slotDurationMinutes?: number | null;
    breakStart?: string | null;
    breakEnd?: string | null;
}

export class ScheduleService {
    constructor(
        private readonly scheduleRepository: ScheduleRepository,
        private readonly slotLockRepository: SlotLockRepository,
        private readonly nowProvider: () => Date = () => new Date(),
    ) { }

    async getWeeklySchedule(staffProfileId: string): Promise<WeeklyScheduleView> {
        await this.ensureStaffExists(staffProfileId);
        const schedules =
            await this.scheduleRepository.listWeeklySchedules(staffProfileId);

        return {
            staffProfileId,
            days: Array.from({ length: 7 }, (_, dayOfWeek) => {
                const schedule = schedules.find(
                    (item) => item.dayOfWeek === dayOfWeek && item.isActive,
                );

                if (!schedule) {
                    return {
                        id: null,
                        dayOfWeek,
                        isActive: false,
                        departmentId: null,
                        startTime: null,
                        endTime: null,
                        slotDurationMinutes: null,
                        breakStart: null,
                        breakEnd: null,
                    };
                }

                return {
                    id: schedule.id,
                    dayOfWeek,
                    isActive: true,
                    departmentId: schedule.departmentId,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    slotDurationMinutes: schedule.slotDurationMinutes,
                    breakStart: schedule.breakStart,
                    breakEnd: schedule.breakEnd,
                };
            }),
        };
    }

    async upsertWeeklySchedule(
        staffProfileId: string,
        days: WeeklyScheduleDayInput[],
        actorUserId?: string,
    ): Promise<WeeklyScheduleView> {
        const staff = await this.ensureStaffExists(staffProfileId);
        const activeDepartmentIds = new Set(
            staff.departments
                .filter(
                    (assignment) =>
                        assignment.unassignedAt === null && assignment.department.isActive,
                )
                .map((assignment) => assignment.departmentId),
        );

        const normalizedDays = this.normalizeWeeklyScheduleDays(
            days,
            activeDepartmentIds,
        );

        await this.scheduleRepository.replaceWeeklySchedules(
            staffProfileId,
            normalizedDays,
            actorUserId,
        );

        return this.getWeeklySchedule(staffProfileId);
    }

    async listExceptions(filters: {
        staffProfileId: string;
        from?: Date;
        to?: Date;
    }): Promise<ScheduleExceptionEntity[]> {
        await this.ensureStaffExists(filters.staffProfileId);

        if (filters.from && filters.to && filters.from > filters.to) {
            throw new AppError('from must be before or equal to to', 400);
        }

        return this.scheduleRepository.listExceptions(filters);
    }

    async createException(
        staffProfileId: string,
        data: CreateScheduleExceptionData,
    ): Promise<ScheduleExceptionEntity> {
        const staff = await this.ensureStaffExists(staffProfileId);

        if (data.departmentId) {
            const hasDepartment = staff.departments.some(
                (assignment) =>
                    assignment.departmentId === data.departmentId &&
                    assignment.unassignedAt === null &&
                    assignment.department.isActive,
            );

            if (!hasDepartment) {
                throw new AppError(
                    'Staff profile is not assigned to this department',
                    400,
                );
            }
        }

        this.validateExceptionWindow(data);

        return this.scheduleRepository.createException(staffProfileId, data);
    }

    async deleteException(staffProfileId: string, exceptionId: string) {
        await this.ensureStaffExists(staffProfileId);
        await this.scheduleRepository.deleteException(staffProfileId, exceptionId);
    }

    async getAvailableSlots(params: {
        staffProfileId: string;
        serviceId: string;
        date: string;
    }): Promise<AvailableSlotsView> {
        const staff = await this.ensureStaffExists(params.staffProfileId);

        if (staff.employmentStatus !== 'ACTIVE') {
            return {
                staffProfileId: params.staffProfileId,
                serviceId: params.serviceId,
                date: params.date,
                slots: [],
            };
        }

        const service = await this.scheduleRepository.findServiceById(
            params.serviceId,
        );

        if (!service || !service.isActive) {
            throw new AppError('Service not found or inactive', 404);
        }

        const date = dateOnlyToUtcDate(params.date);
        const availabilityWindows = this.buildDefaultAvailabilityWindows(date);

        if (availabilityWindows.length === 0) {
            return {
                staffProfileId: params.staffProfileId,
                serviceId: params.serviceId,
                date: params.date,
                slots: [],
            };
        }

        const [bookedAppointments, lockedSlots] = await Promise.all([
            this.scheduleRepository.listBookedAppointments({
                staffProfileId: params.staffProfileId,
                start: date,
                end: addDays(date, 1),
            }),
            this.slotLockRepository.findLockedSlots(params),
        ]);
        const candidateSlots = generateAvailableSlots({
            date: params.date,
            windows: availabilityWindows,
            serviceDurationMinutes: DEFAULT_SCHEDULE_SLOT_DURATION_MINUTES,
            unavailableExceptions: [],
            bookedAppointments: [],
            lockedSlots: [],
        }).filter((slot) =>
            isFutureScheduleClockDate(new Date(slot.start), this.nowProvider()),
        );
        const availableSlots = generateAvailableSlots({
            date: params.date,
            windows: availabilityWindows,
            serviceDurationMinutes: DEFAULT_SCHEDULE_SLOT_DURATION_MINUTES,
            unavailableExceptions: [],
            bookedAppointments,
            lockedSlots,
        }).filter((slot) =>
            isFutureScheduleClockDate(new Date(slot.start), this.nowProvider()),
        );
        const availableStarts = new Set(availableSlots.map((slot) => slot.start));

        return {
            staffProfileId: params.staffProfileId,
            serviceId: params.serviceId,
            date: params.date,
            slots: availableSlots,
            occupiedSlots: candidateSlots.filter((slot) => !availableStarts.has(slot.start)),
        };
    }

    async isSlotWithinSchedule(params: {
        staffProfileId: string;
        serviceId: string;
        scheduledAt: Date;
        endAt: Date;
    }): Promise<boolean> {
        const date = toDateOnly(params.scheduledAt);
        const availableSlots = await this.getAvailableSlotsIgnoringBookedSlots({
            staffProfileId: params.staffProfileId,
            serviceId: params.serviceId,
            date,
        });

        const startIso = params.scheduledAt.toISOString();
        const endIso = params.endAt.toISOString();

        return availableSlots.some(
            (slot) => slot.start === startIso && slot.end === endIso,
        );
    }

    private normalizeWeeklyScheduleDays(
        days: WeeklyScheduleDayInput[],
        activeDepartmentIds: Set<string>,
    ): UpsertScheduleDayData[] {
        if (days.length !== 7) {
            throw new AppError('Weekly schedule must include exactly 7 days', 400);
        }

        const seenDays = new Set<number>();
        const activeDays: UpsertScheduleDayData[] = [];

        for (const day of days) {
            if (seenDays.has(day.dayOfWeek)) {
                throw new AppError('Weekly schedule contains duplicate days', 400);
            }

            seenDays.add(day.dayOfWeek);

            if (!day.isActive) {
                continue;
            }

            if (
                !day.departmentId ||
                !day.startTime ||
                !day.endTime ||
                !day.slotDurationMinutes
            ) {
                throw new AppError(
                    'Active schedule days require departmentId, startTime, endTime, and slotDurationMinutes',
                    400,
                );
            }

            if (!activeDepartmentIds.has(day.departmentId)) {
                throw new AppError(
                    'Staff profile is not assigned to this department',
                    400,
                );
            }

            this.validateTimeWindow({
                startTime: day.startTime,
                endTime: day.endTime,
                breakStart: day.breakStart,
                breakEnd: day.breakEnd,
            });

            activeDays.push({
                dayOfWeek: day.dayOfWeek,
                departmentId: day.departmentId,
                startTime: day.startTime,
                endTime: day.endTime,
                slotDurationMinutes: day.slotDurationMinutes,
                breakStart: day.breakStart ?? null,
                breakEnd: day.breakEnd ?? null,
            });
        }

        return activeDays;
    }

    private validateExceptionWindow(data: CreateScheduleExceptionData) {
        if (!data.isUnavailable && (!data.startTime || !data.endTime)) {
            throw new AppError(
                'Available exceptions require startTime and endTime',
                400,
            );
        }

        if ((data.startTime && !data.endTime) || (!data.startTime && data.endTime)) {
            throw new AppError('startTime and endTime must be provided together', 400);
        }

        if (data.startTime && data.endTime) {
            this.validateTimeWindow({
                startTime: data.startTime,
                endTime: data.endTime,
            });
        }
    }

    private validateTimeWindow(input: {
        startTime: string;
        endTime: string;
        breakStart?: string | null;
        breakEnd?: string | null;
    }) {
        const startMinutes = parseTimeToMinutes(input.startTime);
        const endMinutes = parseTimeToMinutes(input.endTime);

        if (startMinutes === null || endMinutes === null) {
            throw new AppError('Time values must use HH:mm format', 400);
        }

        if (startMinutes >= endMinutes) {
            throw new AppError('startTime must be before endTime', 400);
        }

        if (
            (input.breakStart && !input.breakEnd) ||
            (!input.breakStart && input.breakEnd)
        ) {
            throw new AppError(
                'breakStart and breakEnd must be provided together',
                400,
            );
        }

        if (input.breakStart && input.breakEnd) {
            const breakStartMinutes = parseTimeToMinutes(input.breakStart);
            const breakEndMinutes = parseTimeToMinutes(input.breakEnd);

            if (breakStartMinutes === null || breakEndMinutes === null) {
                throw new AppError('Break values must use HH:mm format', 400);
            }

            if (
                breakStartMinutes >= breakEndMinutes ||
                breakStartMinutes < startMinutes ||
                breakEndMinutes > endMinutes
            ) {
                throw new AppError(
                    'Break window must be inside the schedule window',
                    400,
                );
            }
        }
    }

    private buildDefaultAvailabilityWindows(date: Date): AvailabilityWindow[] {
        if (isWeekend(date)) return [];

        return [
            {
                startMinutes: DEFAULT_SCHEDULE_START_MINUTES,
                endMinutes: DEFAULT_SCHEDULE_END_MINUTES,
                slotDurationMinutes: DEFAULT_SCHEDULE_SLOT_DURATION_MINUTES,
            },
        ];
    }

    private async getAvailableSlotsIgnoringBookedSlots(params: {
        staffProfileId: string;
        serviceId: string;
        date: string;
    }) {
        const staff = await this.ensureStaffExists(params.staffProfileId);

        if (staff.employmentStatus !== 'ACTIVE') {
            return [];
        }

        const service = await this.scheduleRepository.findServiceById(
            params.serviceId,
        );

        if (!service || !service.isActive) {
            throw new AppError('Service not found or inactive', 404);
        }

        const date = dateOnlyToUtcDate(params.date);
        const availabilityWindows = this.buildDefaultAvailabilityWindows(date);

        if (availabilityWindows.length === 0) {
            return [];
        }

        return generateAvailableSlots({
            date: params.date,
            windows: availabilityWindows,
            serviceDurationMinutes: DEFAULT_SCHEDULE_SLOT_DURATION_MINUTES,
            unavailableExceptions: [],
            bookedAppointments: [],
            lockedSlots: [],
        });
    }

    private async ensureStaffExists(staffProfileId: string) {
        const staff = await this.scheduleRepository.findStaffById(staffProfileId);

        if (!staff) {
            throw new AppError('Staff profile not found', 404);
        }

        return staff;
    }
}
