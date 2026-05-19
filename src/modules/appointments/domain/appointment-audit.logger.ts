export interface AppointmentAuditLogger {
    recordReschedule(input: {
        appointmentId: string;
        actorUserId?: string;
        oldScheduledAt: Date;
        oldEndAt: Date;
        newScheduledAt: Date;
        newEndAt: Date;
    }): Promise<void>;
}
