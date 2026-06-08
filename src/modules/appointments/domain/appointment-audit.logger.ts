export interface AppointmentAuditLogger {
    recordBooking(input: {
        appointmentId: string;
        actorUserId?: string;
        scheduledAt: Date;
        endAt: Date;
    }): Promise<void>;
    recordReschedule(input: {
        appointmentId: string;
        actorUserId?: string;
        oldScheduledAt: Date;
        oldEndAt: Date;
        newScheduledAt: Date;
        newEndAt: Date;
    }): Promise<void>;
}
