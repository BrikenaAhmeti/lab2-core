import { AvailableSlotView } from '../../schedules/domain/schedule.entity';
import { ScheduleService } from '../../schedules/services/schedule.service';
import {
    CheckAvailabilityInput,
    VapiAvailabilityResponse,
    VapiAvailabilitySlot,
    VapiCompleteAppointmentContext,
} from '../domain/vapi-appointment.types';
import { AppointmentContextResolverService } from './appointment-context-resolver.service';
import {
    clinicIsoDateTimeToInstant,
    formatClinicDateTime,
    minutesFromUtcClock,
    normalizeDateInput,
    preferredTimeToMinutes,
} from './vapi-date-time';

export interface ResolvedAvailabilitySlot {
    raw: AvailableSlotView;
    start: Date;
    end: Date;
    response: VapiAvailabilitySlot;
}

export class AppointmentAvailabilityService {
    constructor(
        private readonly resolver: AppointmentContextResolverService,
        private readonly scheduleService: ScheduleService,
        private readonly nowProvider: () => Date = () => new Date(),
    ) {}

    async checkAvailability(
        input: CheckAvailabilityInput,
    ): Promise<VapiAvailabilityResponse> {
        const date = normalizeDateInput(input.date, this.nowProvider());

        if (!date) {
            return {
                success: false,
                message: 'Please provide a valid appointment date.',
            };
        }

        const contextResult = await this.resolver.resolveCompleteAppointmentContext(
            input,
        );

        if (!('context' in contextResult)) {
            if (contextResult.success && contextResult.needsClarification) {
                return {
                    ...contextResult,
                    originalDate: input.date,
                    resolvedDate: date,
                    preferredTime: input.preferredTime,
                };
            }

            return contextResult;
        }

        const slots = await this.getAvailableSlotsForContext(
            contextResult.context,
            date,
            input.preferredTime,
        );

        if (slots.length === 0) {
            return {
                success: true,
                available: false,
                needsClarification: false,
                message: 'No available times were found for this doctor on that date.',
                resolvedDate: date,
                resolved: this.toResolvedResponse(contextResult.context),
                slots: [],
            };
        }

        return {
            success: true,
            available: true,
            needsClarification: false,
            message: 'I found available times.',
            resolvedDate: date,
            resolved: this.toResolvedResponse(contextResult.context),
            slots: slots.slice(0, 5).map((slot) => slot.response),
        };
    }

    async getAvailableSlotsForContext(
        context: VapiCompleteAppointmentContext,
        date: string,
        preferredTime?: string,
    ): Promise<ResolvedAvailabilitySlot[]> {
        const availability = await this.scheduleService.getAvailableSlots({
            staffProfileId: context.doctorId,
            serviceId: context.serviceId,
            date,
        });
        const now = this.nowProvider();
        const preferredMinutes = preferredTimeToMinutes(preferredTime);

        return availability.slots
            .map((slot) => ({
                raw: slot,
                start: new Date(slot.start),
                end: new Date(slot.end),
                response: {
                    label: slot.startTime,
                    startTime: formatClinicDateTime(new Date(slot.start)),
                    endTime: formatClinicDateTime(new Date(slot.end)),
                },
            }))
            .filter((slot) => {
                const instant = clinicIsoDateTimeToInstant(slot.response.startTime);

                return instant !== null && instant > now;
            })
            .sort((left, right) => {
                if (preferredMinutes === null) {
                    return left.start.getTime() - right.start.getTime();
                }

                const leftDistance = Math.abs(
                    minutesFromUtcClock(left.start) - preferredMinutes,
                );
                const rightDistance = Math.abs(
                    minutesFromUtcClock(right.start) - preferredMinutes,
                );

                return (
                    leftDistance - rightDistance ||
                    left.start.getTime() - right.start.getTime()
                );
            });
    }

    private toResolvedResponse(context: VapiCompleteAppointmentContext) {
        return {
            doctorName: context.doctorName,
            serviceName: context.serviceName,
            departmentName: context.departmentName,
            durationMinutes: context.durationMinutes,
        };
    }
}
