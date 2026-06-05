import { Request, Response } from 'express';
import { env } from '../../../config/env';
import { SchedulePrismaRepository } from '../../schedules/infrastructure/schedule.prisma.repository';
import { ScheduleService } from '../../schedules/services/schedule.service';
import { BillingAppointmentEventPublisher } from '../../billing/infrastructure/billing-appointment-event.publisher';
import {
    AuditLogAppointmentAuditLogger,
    NoopAppointmentAuditLogger,
} from '../infrastructure/appointment-audit.logger';
import { AppointmentPrismaRepository } from '../infrastructure/appointment.prisma.repository';
import { createAppointmentSlotLockRepository } from '../infrastructure/appointment-slot-lock.repository';
import { CompositeAppointmentEventPublisher } from '../infrastructure/composite-appointment-event.publisher';
import { NotificationAppointmentEventPublisher } from '../infrastructure/notification-appointment-event.publisher';
import { VapiAppointmentPrismaRepository } from '../infrastructure/vapi-appointment.prisma.repository';
import { AppointmentService } from '../services/appointment.service';
import { AppointmentAvailabilityService } from '../services/appointment-availability.service';
import { AppointmentContextResolverService } from '../services/appointment-context-resolver.service';
import { VapiToolsService } from '../services/vapi-tools.service';
import { vapiToolRequestSchema } from '../domain/vapi-tools.schemas';

export class VapiToolsController {
    private readonly slotLockRepository = createAppointmentSlotLockRepository();
    private readonly scheduleService = new ScheduleService(
        new SchedulePrismaRepository(),
        this.slotLockRepository,
    );
    private readonly appointmentService = new AppointmentService(
        new AppointmentPrismaRepository(),
        this.scheduleService,
        this.slotLockRepository,
        new CompositeAppointmentEventPublisher([
            new BillingAppointmentEventPublisher(),
            new NotificationAppointmentEventPublisher(),
        ]),
        env.auditLoggingEnabled
            ? new AuditLogAppointmentAuditLogger()
            : new NoopAppointmentAuditLogger(),
    );
    private readonly vapiRepository = new VapiAppointmentPrismaRepository();
    private readonly resolver = new AppointmentContextResolverService(
        this.vapiRepository,
    );
    private readonly availabilityService = new AppointmentAvailabilityService(
        this.resolver,
        this.scheduleService,
    );
    private readonly service = new VapiToolsService(
        this.resolver,
        this.availabilityService,
        this.vapiRepository,
        this.appointmentService,
    );

    async handle(req: Request, res: Response) {
        const normalized = normalizeToolRequest(req.body);

        if (!normalized) {
            return res.status(200).json({
                success: false,
                message: 'Invalid Vapi tool request.',
            });
        }

        const parsed = vapiToolRequestSchema.safeParse(normalized);

        if (!parsed.success) {
            return res.status(200).json({
                success: false,
                message: parsed.error.issues[0]?.message ?? 'Invalid Vapi tool request.',
            });
        }

        const result = await this.service.handleTool(
            parsed.data.toolName,
            parsed.data.arguments,
        );

        return res.status(200).json(result);
    }
}

function normalizeToolRequest(body: unknown) {
    if (!body || typeof body !== 'object') {
        return null;
    }

    const record = body as Record<string, unknown>;
    const toolName = record.toolName ?? record.name ?? record.tool;

    if (typeof toolName !== 'string') {
        return null;
    }

    const rawArguments =
        record.arguments ?? record.args ?? record.input ?? record.parameters ?? {};
    const parsedArguments = parseArguments(rawArguments);

    if (!parsedArguments) {
        return null;
    }

    return {
        toolName,
        arguments: parsedArguments,
    };
}

function parseArguments(value: unknown): Record<string, unknown> | null {
    if (value === undefined || value === null) {
        return {};
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as unknown;
            return parseArguments(parsed);
        } catch {
            return null;
        }
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }

    return null;
}
