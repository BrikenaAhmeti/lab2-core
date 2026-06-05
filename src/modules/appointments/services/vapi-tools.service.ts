import { AppointmentType } from '../../../generated/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import { logger } from '../../../shared/utils/winston';
import { normalizePersonalNumber } from '../../patients/domain/patient.normalizer';
import { AppointmentService } from './appointment.service';
import { AppointmentAvailabilityService } from './appointment-availability.service';
import { AppointmentContextResolverService } from './appointment-context-resolver.service';
import {
    INCOMPLETE_PERSONAL_NUMBER_MESSAGE,
    normalizePersonalNumberForVapi,
    normalizePhoneForVapi,
    normalizeSpokenEmail,
} from './vapi-contact-normalizer';
import {
    schemaForVapiTool,
} from '../domain/vapi-tools.schemas';
import { VapiAppointmentRepository } from '../domain/vapi-appointment.repository';
import {
    BookAppointmentInput,
    CheckAvailabilityInput,
    ResolveAppointmentContextInput,
    VapiBookingResponse,
    VapiPatientCandidate,
    VapiToolResponse,
} from '../domain/vapi-appointment.types';
import {
    formatClinicDateTime,
    getAppointmentTimeZone,
    normalizeDateInput,
    parseAppointmentStartTime,
    parseDateOfBirth,
    preferredTimeToMinutes,
} from './vapi-date-time';

export class VapiToolsService {
    constructor(
        private readonly resolver: AppointmentContextResolverService,
        private readonly availabilityService: AppointmentAvailabilityService,
        private readonly appointmentRepository: VapiAppointmentRepository,
        private readonly appointmentService: AppointmentService,
        private readonly nowProvider: () => Date = () => new Date(),
    ) {}

    async handleTool(
        toolName: string,
        rawArguments: Record<string, unknown>,
    ): Promise<VapiToolResponse> {
        const schema = schemaForVapiTool(toolName);

        if (!schema) {
            const response: VapiToolResponse = {
                success: false,
                message: `Unsupported Vapi tool: ${toolName}`,
            };

            this.logToolCall(toolName, rawArguments ?? {}, response);
            return response;
        }

        const parsed = schema.safeParse(rawArguments ?? {});

        if (!parsed.success) {
            const response: VapiToolResponse = {
                success: false,
                message: parsed.error.issues[0]?.message ?? 'Invalid tool input.',
            };

            this.logToolCall(toolName, rawArguments ?? {}, response);
            return response;
        }

        let response: VapiToolResponse;

        if (toolName === 'resolveAppointmentContext') {
            response = await this.resolveAppointmentContext(
                parsed.data as ResolveAppointmentContextInput,
            );
        } else if (toolName === 'checkAvailability') {
            response = await this.checkAvailability(parsed.data as CheckAvailabilityInput);
        } else {
            response = await this.bookAppointment(parsed.data as BookAppointmentInput);
        }

        this.logToolCall(toolName, parsed.data as Record<string, unknown>, response);
        return response;
    }

    async resolveAppointmentContext(input: ResolveAppointmentContextInput) {
        return this.resolver.resolveAppointmentContext(input);
    }

    async checkAvailability(input: CheckAvailabilityInput) {
        return this.availabilityService.checkAvailability(input);
    }

    async bookAppointment(
        input: BookAppointmentInput,
    ): Promise<VapiBookingResponse> {
        const normalizedPersonalNumber = normalizePersonalNumberForVapi(
            input.personalNumber,
        );

        if (!normalizedPersonalNumber) {
            return {
                success: false,
                message: INCOMPLETE_PERSONAL_NUMBER_MESSAGE,
            };
        }

        const normalizedPhone = normalizePhoneForVapi(input.patientPhone);
        const normalizedEmail = normalizeSpokenEmail(input.patientEmail);

        if (input.patientEmail && normalizedEmail === null) {
            return {
                success: false,
                message: 'Please provide a valid patient email address.',
            };
        }

        const normalizedInput: BookAppointmentInput = {
            ...input,
            personalNumber: normalizedPersonalNumber,
            patientPhone: normalizedPhone,
            patientEmail: normalizedEmail ?? undefined,
        };
        const parsedStartTime = parseAppointmentStartTime(input.startTime);

        if (!parsedStartTime) {
            return {
                success: false,
                message: 'Please choose a valid future appointment start time from the available slots.',
            };
        }

        if (parsedStartTime.instant <= this.nowProvider()) {
            return {
                success: false,
                message: 'Past appointments cannot be booked. Please choose a future time.',
            };
        }

        const contextResult = await this.resolver.resolveCompleteAppointmentContext(
            normalizedInput,
        );

        if (!('context' in contextResult)) {
            return contextResult;
        }

        const matchingSlots = await this.availabilityService.getAvailableSlotsForContext(
            contextResult.context,
            parsedStartTime.dateOnly,
        );
        const requestedSlot = matchingSlots.find(
            (slot) =>
                slot.start.toISOString() === parsedStartTime.value.toISOString() &&
                slot.response.startTime === input.startTime.trim(),
        );

        if (!requestedSlot) {
            return this.unavailable();
        }

        const dateOfBirth = input.dateOfBirth
            ? parseDateOfBirth(input.dateOfBirth)
            : null;

        if (input.dateOfBirth && !dateOfBirth) {
            return {
                success: false,
                message: 'Please provide a valid patient date of birth.',
            };
        }

        let patient: VapiPatientCandidate;

        try {
            patient = await this.findOrCreatePatient(normalizedInput, dateOfBirth);
        } catch {
            return {
                success: false,
                message: 'Patient profile could not be saved for this booking.',
            };
        }

        try {
            const appointment = await this.appointmentService.bookAppointment({
                patientId: patient.id,
                serviceCatalogId: contextResult.context.serviceId,
                staffProfileId: contextResult.context.doctorId,
                scheduledAt: parsedStartTime.value,
                appointmentType: AppointmentType.IN_PERSON,
                notes: normalizedInput.notes,
            });

            return {
                success: true,
                appointmentId: appointment.id,
                message: 'Appointment booked successfully.',
                appointment: {
                    patientName: appointment.patient.name,
                    personalNumberMasked: maskPersonalNumber(normalizedInput.personalNumber),
                    doctorName: contextResult.context.doctorName,
                    departmentName: contextResult.context.departmentName,
                    serviceName: contextResult.context.serviceName,
                    startTime: formatClinicDateTime(appointment.scheduledAt),
                },
            };
        } catch (error) {
            if (
                error instanceof AppError &&
                (error.statusCode === 400 || error.statusCode === 409)
            ) {
                return this.unavailable();
            }

            return {
                success: false,
                message: 'Appointment booking could not be completed.',
            };
        }
    }

    private async findOrCreatePatient(
        input: BookAppointmentInput,
        dateOfBirth: Date | null,
    ) {
        const existing = await this.appointmentRepository.findPatientByPersonalNumber(
            input.personalNumber,
        );

        if (existing) {
            return existing;
        }

        return this.appointmentRepository.createPatient({
            firstName: input.patientFirstName,
            lastName: input.patientLastName,
            personalNumber: input.personalNumber,
            phone: input.patientPhone,
            email: input.patientEmail,
            dateOfBirth,
        });
    }

    private unavailable(): VapiBookingResponse {
        return {
            success: false,
            message: 'This time is no longer available. Please choose another time.',
        };
    }

    private logToolCall(
        toolName: string,
        inputArguments: Record<string, unknown>,
        response: VapiToolResponse,
    ) {
        const normalizedDate = normalizedDateForLog(
            toolName,
            inputArguments,
            response,
            this.nowProvider(),
        );
        const normalizedTime = normalizedTimeForLog(inputArguments);

        logger.info('vapi_tool_call', {
            metadata: {
                toolName,
                inputArguments: sanitizeArgumentsForLog(inputArguments),
                normalizedDate,
                normalizedTime,
                resolved: resolvedForLog(response),
                returnedSlots: slotsForLog(response),
                bookingStartTime:
                    typeof inputArguments.startTime === 'string'
                        ? inputArguments.startTime.trim()
                        : undefined,
                timezoneUsed: getAppointmentTimeZone(),
                success: response.success,
                needsClarification:
                    'needsClarification' in response
                        ? response.needsClarification
                        : undefined,
            },
        });
    }
}

function maskPersonalNumber(personalNumber: string) {
    const normalized = normalizePersonalNumber(personalNumber) ?? '';

    if (normalized.length <= 3) {
        return '*'.repeat(normalized.length);
    }

    return `${'*'.repeat(normalized.length - 3)}${normalized.slice(-3)}`;
}

function normalizedDateForLog(
    toolName: string,
    inputArguments: Record<string, unknown>,
    response: VapiToolResponse,
    now: Date,
) {
    if ('resolvedDate' in response && response.resolvedDate) {
        return response.resolvedDate;
    }

    if (toolName === 'checkAvailability' && typeof inputArguments.date === 'string') {
        return normalizeDateInput(inputArguments.date, now);
    }

    if (toolName === 'bookAppointment' && typeof inputArguments.startTime === 'string') {
        return parseAppointmentStartTime(inputArguments.startTime)?.dateOnly ?? null;
    }

    return undefined;
}

function normalizedTimeForLog(inputArguments: Record<string, unknown>) {
    if (typeof inputArguments.preferredTime === 'string') {
        const minutes = preferredTimeToMinutes(inputArguments.preferredTime);

        if (minutes !== null) {
            return formatMinutes(minutes);
        }
    }

    if (typeof inputArguments.startTime === 'string') {
        return parseAppointmentStartTime(inputArguments.startTime)?.time ?? null;
    }

    return undefined;
}

function resolvedForLog(response: VapiToolResponse) {
    if ('resolved' in response) {
        return response.resolved;
    }

    if ('appointment' in response) {
        return {
            doctorName: response.appointment.doctorName,
            serviceName: response.appointment.serviceName,
            departmentName: response.appointment.departmentName,
        };
    }

    return undefined;
}

function slotsForLog(response: VapiToolResponse) {
    return 'slots' in response ? response.slots : undefined;
}

function sanitizeArgumentsForLog(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sanitizeArgumentsForLog);
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => {
            if (key.toLowerCase() === 'personalnumber') {
                const normalized = normalizePersonalNumberForVapi(
                    typeof entry === 'string' ? entry : String(entry ?? ''),
                );

                return [key, normalized ? maskPersonalNumber(normalized) : '[INVALID]'];
            }

            return [key, sanitizeArgumentsForLog(entry)];
        }),
    );
}

function formatMinutes(minutes: number) {
    return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60)
        .toString()
        .padStart(2, '0')}`;
}
