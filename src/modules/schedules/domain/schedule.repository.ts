import {
    BookedAppointmentSlot,
    ScheduleExceptionEntity,
    ServiceSlotSummary,
    StaffScheduleEntity,
    StaffScheduleStaffSummary,
} from './schedule.entity';

export interface UpsertScheduleDayData {
    dayOfWeek: number;
    departmentId: string;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    breakStart?: string | null;
    breakEnd?: string | null;
}

export interface CreateScheduleExceptionData {
    departmentId?: string | null;
    exceptionDate: Date;
    startTime?: string | null;
    endTime?: string | null;
    isUnavailable: boolean;
    reason?: string | null;
    actorUserId?: string;
}

export interface ScheduleRepository {
    findStaffById(id: string): Promise<StaffScheduleStaffSummary | null>;
    findServiceById(id: string): Promise<ServiceSlotSummary | null>;
    listWeeklySchedules(staffProfileId: string): Promise<StaffScheduleEntity[]>;
    replaceWeeklySchedules(
        staffProfileId: string,
        days: UpsertScheduleDayData[],
        actorUserId?: string,
    ): Promise<StaffScheduleEntity[]>;
    listExceptions(filters: {
        staffProfileId: string;
        from?: Date;
        to?: Date;
    }): Promise<ScheduleExceptionEntity[]>;
    createException(
        staffProfileId: string,
        data: CreateScheduleExceptionData,
    ): Promise<ScheduleExceptionEntity>;
    deleteException(staffProfileId: string, exceptionId: string): Promise<void>;
    listSchedulesForDay(filters: {
        staffProfileId: string;
        dayOfWeek: number;
    }): Promise<StaffScheduleEntity[]>;
    listExceptionsForDate(filters: {
        staffProfileId: string;
        departmentId: string;
        date: Date;
    }): Promise<ScheduleExceptionEntity[]>;
    listBookedAppointments(filters: {
        staffProfileId: string;
        start: Date;
        end: Date;
    }): Promise<BookedAppointmentSlot[]>;
}
