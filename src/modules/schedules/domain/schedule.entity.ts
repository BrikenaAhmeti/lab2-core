export interface StaffScheduleEntity {
    id: string;
    staffProfileId: string;
    departmentId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    breakStart: string | null;
    breakEnd: string | null;
    validFrom: Date | null;
    validTo: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface WeeklyScheduleDayView {
    id: string | null;
    dayOfWeek: number;
    isActive: boolean;
    departmentId: string | null;
    startTime: string | null;
    endTime: string | null;
    slotDurationMinutes: number | null;
    breakStart: string | null;
    breakEnd: string | null;
}

export interface WeeklyScheduleView {
    staffProfileId: string;
    days: WeeklyScheduleDayView[];
}

export interface ScheduleExceptionEntity {
    id: string;
    staffProfileId: string;
    departmentId: string | null;
    exceptionDate: Date;
    startTime: string | null;
    endTime: string | null;
    isUnavailable: boolean;
    reason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ServiceSlotSummary {
    id: string;
    departmentId: string;
    defaultDurationMinutes: number;
    isActive: boolean;
}

export interface StaffScheduleStaffSummary {
    id: string;
    employmentStatus: string;
    departments: Array<{
        departmentId: string;
        unassignedAt: Date | null;
        department: {
            id: string;
            isActive: boolean;
        };
    }>;
}

export interface BookedAppointmentSlot {
    scheduledAt: Date;
    endAt: Date;
}

export interface AvailableSlotView {
    start: string;
    end: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
}

export interface AvailableSlotsView {
    staffProfileId: string;
    serviceId: string;
    date: string;
    slots: AvailableSlotView[];
    occupiedSlots?: AvailableSlotView[];
}
