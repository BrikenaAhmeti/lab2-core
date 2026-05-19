import { auditLog } from '../../../shared/middleware/audit-logger';
import { AppointmentAuditLogger } from '../domain/appointment-audit.logger';

export class NoopAppointmentAuditLogger implements AppointmentAuditLogger {
    async recordReschedule(): Promise<void> {
        return undefined;
    }
}

export class AuditLogAppointmentAuditLogger implements AppointmentAuditLogger {
    async recordReschedule(input: {
        appointmentId: string;
        actorUserId?: string;
        oldScheduledAt: Date;
        oldEndAt: Date;
        newScheduledAt: Date;
        newEndAt: Date;
    }): Promise<void> {
        try {
            await auditLog({
                action: 'reschedule',
                entity: 'appointments',
                entityId: input.appointmentId,
                userId: input.actorUserId,
                oldValue: {
                    scheduledAt: input.oldScheduledAt,
                    endAt: input.oldEndAt,
                },
                newValue: {
                    scheduledAt: input.newScheduledAt,
                    endAt: input.newEndAt,
                },
            });
        } catch {
            // Rescheduling should not fail because the audit write had a transient issue.
        }
    }
}
