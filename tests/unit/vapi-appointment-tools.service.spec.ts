import { AppointmentType, AppointmentStatus } from '../../src/generated/prisma';
import { AppointmentService } from '../../src/modules/appointments/services/appointment.service';
import { AppointmentAvailabilityService } from '../../src/modules/appointments/services/appointment-availability.service';
import { AppointmentContextResolverService } from '../../src/modules/appointments/services/appointment-context-resolver.service';
import { VapiToolsService } from '../../src/modules/appointments/services/vapi-tools.service';
import { VapiAppointmentRepository } from '../../src/modules/appointments/domain/vapi-appointment.repository';
import { ScheduleService } from '../../src/modules/schedules/services/schedule.service';

const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const serviceId = '6f817061-d12c-42d1-8d57-24a0ddbd8b82';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const start = new Date('2030-01-02T09:00:00.000Z');
const end = new Date('2030-01-02T09:30:00.000Z');

const department = { id: departmentId, name: 'General Medicine' };
const service = {
    id: serviceId,
    name: 'General Consultation',
    departmentId,
    departmentName: department.name,
    defaultDurationMinutes: 30,
    defaultPrice: 40,
};
const doctor = {
    id: staffProfileId,
    userId: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
    displayName: 'Dr. Arben Krasniqi',
    employeeCode: 'DR-001',
    specialization: 'Family Medicine',
    departments: [{ id: departmentId, name: department.name, isPrimary: true }],
};
const context = {
    doctorId: staffProfileId,
    doctorName: doctor.displayName,
    serviceId,
    serviceName: service.name,
    departmentId,
    departmentName: department.name,
    durationMinutes: 30,
};
const patient = {
    id: patientId,
    firstName: 'Ariana',
    lastName: 'Berisha',
    email: null,
    phone: null,
    personalNumber: '1234567890',
};
const appointment = {
    id: 'e61720ab-6446-4da3-a4bc-f642940e4a81',
    patientId,
    departmentId,
    serviceCatalogId: serviceId,
    staffProfileId,
    status: AppointmentStatus.SCHEDULED,
    appointmentType: AppointmentType.IN_PERSON,
    scheduledAt: start,
    endAt: end,
    durationMinutes: 30,
    basePrice: 40,
    notes: null,
    checkedInAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationNote: null,
    createdAt: new Date('2030-01-01T00:00:00.000Z'),
    updatedAt: new Date('2030-01-01T00:00:00.000Z'),
    patient: {
        ...patient,
        userId: null,
        name: 'Ariana Berisha',
    },
    staff: null,
    service: {
        id: serviceId,
        name: service.name,
        defaultDurationMinutes: 30,
        defaultPrice: 40,
    },
    department: {
        id: departmentId,
        name: department.name,
        isActive: true,
    },
};

function createRepository(): jest.Mocked<VapiAppointmentRepository> {
    return {
        searchDoctors: jest.fn(),
        searchServices: jest.fn(),
        searchDepartments: jest.fn(),
        findPatientByPersonalNumber: jest.fn(),
        createPatient: jest.fn(),
    };
}

describe('AppointmentContextResolverService', () => {
    it('resolves doctor, service and department from natural names', async () => {
        const repository = createRepository();
        repository.searchDoctors.mockResolvedValue([doctor]);
        repository.searchServices.mockResolvedValue([service]);
        repository.searchDepartments.mockResolvedValue([]);
        const resolver = new AppointmentContextResolverService(repository);

        const result = await resolver.resolveAppointmentContext({
            doctorName: 'Arben',
            serviceName: 'general consultation',
        });

        expect(result).toMatchObject({
            success: true,
            needsClarification: false,
            resolved: {
                doctorId: staffProfileId,
                serviceId,
                departmentId,
                durationMinutes: 30,
            },
        });
    });

    it('returns clarification when multiple doctors match', async () => {
        const repository = createRepository();
        repository.searchDoctors.mockResolvedValue([
            doctor,
            { ...doctor, id: '553b7447-c546-4551-b1aa-0da40e408c65', displayName: 'Dr. Arben Gashi' },
        ]);
        const resolver = new AppointmentContextResolverService(repository);

        const result = await resolver.resolveAppointmentContext({ doctorName: 'Arben' });

        expect(result).toMatchObject({
            success: true,
            needsClarification: true,
            message: 'I found more than one matching doctor. Please choose one.',
        });
    });
});

describe('AppointmentAvailabilityService', () => {
    it('normalizes natural dates and returns available slots closest to preferred time first', async () => {
        const resolver = {
            resolveCompleteAppointmentContext: jest.fn().mockResolvedValue({
                success: true,
                context,
            }),
        } as unknown as AppointmentContextResolverService;
        const scheduleService = {
            getAvailableSlots: jest.fn().mockResolvedValue({
                staffProfileId,
                serviceId,
                date: '2030-01-02',
                slots: [
                    {
                        start: '2030-01-02T09:00:00.000Z',
                        end: '2030-01-02T09:30:00.000Z',
                        startTime: '09:00',
                        endTime: '09:30',
                        durationMinutes: 30,
                    },
                    {
                        start: '2030-01-02T14:00:00.000Z',
                        end: '2030-01-02T14:30:00.000Z',
                        startTime: '14:00',
                        endTime: '14:30',
                        durationMinutes: 30,
                    },
                ],
            }),
        } as unknown as ScheduleService;
        const availability = new AppointmentAvailabilityService(
            resolver,
            scheduleService,
            () => new Date('2030-01-01T08:00:00.000Z'),
        );

        const result = await availability.checkAvailability({
            doctorName: 'Arben',
            serviceName: service.name,
            date: 'tomorrow',
            preferredTime: 'afternoon',
        });

        expect(scheduleService.getAvailableSlots).toHaveBeenCalledWith({
            staffProfileId,
            serviceId,
            date: '2030-01-02',
        });
        expect(result).toMatchObject({
            success: true,
            available: true,
            resolvedDate: '2030-01-02',
            slots: [{ label: '14:00' }, { label: '09:00' }],
        });
        expect(result.success && 'slots' in result ? result.slots[0].startTime : null)
            .toBe('2030-01-02T14:00:00+01:00');
    });

    it('keeps original date and preferred time when availability needs clarification', async () => {
        const resolver = {
            resolveCompleteAppointmentContext: jest.fn().mockResolvedValue({
                success: true,
                needsClarification: true,
                message: 'I found more than one matching service. Please choose one.',
                options: [{ type: 'service', label: 'General Consultation, General Medicine' }],
            }),
        } as unknown as AppointmentContextResolverService;
        const scheduleService = {
            getAvailableSlots: jest.fn(),
        } as unknown as ScheduleService;
        const availability = new AppointmentAvailabilityService(
            resolver,
            scheduleService,
            () => new Date('2030-01-01T08:00:00.000Z'),
        );

        const result = await availability.checkAvailability({
            serviceName: 'general',
            date: 'tomorrow',
            preferredTime: 'morning',
        });

        expect(result).toMatchObject({
            success: true,
            needsClarification: true,
            originalDate: 'tomorrow',
            resolvedDate: '2030-01-02',
            preferredTime: 'morning',
        });
    });
});

describe('VapiToolsService', () => {
    it('creates a minimal patient and books an appointment', async () => {
        const resolver = {
            resolveCompleteAppointmentContext: jest.fn().mockResolvedValue({
                success: true,
                context,
            }),
        } as unknown as AppointmentContextResolverService;
        const availability = {
            getAvailableSlotsForContext: jest.fn().mockResolvedValue([
                {
                    start,
                    end,
                    response: {
                        label: '09:00',
                        startTime: '2030-01-02T09:00:00+01:00',
                        endTime: '2030-01-02T09:30:00+01:00',
                    },
                },
            ]),
        } as unknown as AppointmentAvailabilityService;
        const repository = createRepository();
        repository.findPatientByPersonalNumber.mockResolvedValue(null);
        repository.createPatient.mockResolvedValue(patient);
        const appointmentService = {
            bookAppointment: jest.fn().mockResolvedValue(appointment),
        } as unknown as AppointmentService;
        const serviceUnderTest = new VapiToolsService(
            resolver,
            availability,
            repository,
            appointmentService,
            () => new Date('2030-01-01T08:00:00.000Z'),
        );

        const result = await serviceUnderTest.bookAppointment({
            doctorName: 'Arben Krasniqi',
            serviceName: service.name,
            startTime: '2030-01-02T09:00:00+01:00',
            personalNumber: '1 2,3.4 plus 5.6 7 8 9 0',
            patientFirstName: 'Ariana',
            patientLastName: 'Berisha',
            patientPhone: 'plus 383 44,111.222',
            patientEmail: 'Ariana at Example dot COM',
        });

        expect(repository.createPatient).toHaveBeenCalledWith(
            expect.objectContaining({
                personalNumber: '1234567890',
                firstName: 'Ariana',
                lastName: 'Berisha',
                phone: '38344111222',
                email: 'ariana@example.com',
            }),
        );
        expect(appointmentService.bookAppointment).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                serviceCatalogId: serviceId,
                staffProfileId,
                appointmentType: AppointmentType.IN_PERSON,
            }),
        );
        expect(result).toMatchObject({
            success: true,
            appointmentId: appointment.id,
            appointment: {
                personalNumberMasked: '*******890',
            },
        });
    });

    it('rejects incomplete personal numbers before booking', async () => {
        const resolver = {
            resolveCompleteAppointmentContext: jest.fn(),
        } as unknown as AppointmentContextResolverService;
        const availability = {
            getAvailableSlotsForContext: jest.fn(),
        } as unknown as AppointmentAvailabilityService;
        const repository = createRepository();
        const appointmentService = {
            bookAppointment: jest.fn(),
        } as unknown as AppointmentService;
        const serviceUnderTest = new VapiToolsService(
            resolver,
            availability,
            repository,
            appointmentService,
            () => new Date('2030-01-01T08:00:00.000Z'),
        );

        const result = await serviceUnderTest.bookAppointment({
            doctorName: 'Arben Krasniqi',
            serviceName: service.name,
            startTime: '2030-01-02T09:00:00+01:00',
            personalNumber: '12 3',
            patientFirstName: 'Ariana',
            patientLastName: 'Berisha',
        });

        expect(result).toEqual({
            success: false,
            message: 'The personal number seems incomplete. Please provide it again.',
        });
        expect(resolver.resolveCompleteAppointmentContext).not.toHaveBeenCalled();
        expect(appointmentService.bookAppointment).not.toHaveBeenCalled();
    });

    it('requires the exact ISO startTime returned by availability', async () => {
        const resolver = {
            resolveCompleteAppointmentContext: jest.fn().mockResolvedValue({
                success: true,
                context,
            }),
        } as unknown as AppointmentContextResolverService;
        const availability = {
            getAvailableSlotsForContext: jest.fn().mockResolvedValue([
                {
                    start,
                    end,
                    response: {
                        label: '09:00',
                        startTime: '2030-01-02T09:00:00+01:00',
                        endTime: '2030-01-02T09:30:00+01:00',
                    },
                },
            ]),
        } as unknown as AppointmentAvailabilityService;
        const repository = createRepository();
        const appointmentService = {
            bookAppointment: jest.fn(),
        } as unknown as AppointmentService;
        const serviceUnderTest = new VapiToolsService(
            resolver,
            availability,
            repository,
            appointmentService,
            () => new Date('2030-01-01T08:00:00.000Z'),
        );

        const result = await serviceUnderTest.bookAppointment({
            doctorName: 'Arben Krasniqi',
            serviceName: service.name,
            startTime: '2030-01-02T09:00+01:00',
            personalNumber: '1234567890',
            patientFirstName: 'Ariana',
            patientLastName: 'Berisha',
        });

        expect(result).toMatchObject({
            success: false,
            message: 'This time is no longer available. Please choose another time.',
        });
        expect(appointmentService.bookAppointment).not.toHaveBeenCalled();
    });

    it('rejects startTime values outside the Europe/Belgrade ISO offset', async () => {
        const resolver = {
            resolveCompleteAppointmentContext: jest.fn(),
        } as unknown as AppointmentContextResolverService;
        const availability = {
            getAvailableSlotsForContext: jest.fn(),
        } as unknown as AppointmentAvailabilityService;
        const repository = createRepository();
        const appointmentService = {
            bookAppointment: jest.fn(),
        } as unknown as AppointmentService;
        const serviceUnderTest = new VapiToolsService(
            resolver,
            availability,
            repository,
            appointmentService,
            () => new Date('2030-01-01T08:00:00.000Z'),
        );

        const result = await serviceUnderTest.bookAppointment({
            doctorName: 'Arben Krasniqi',
            serviceName: service.name,
            startTime: '2030-01-02T09:00:00+02:00',
            personalNumber: '1234567890',
            patientFirstName: 'Ariana',
            patientLastName: 'Berisha',
        });

        expect(result).toMatchObject({
            success: false,
            message: 'Please choose a valid future appointment start time from the available slots.',
        });
        expect(resolver.resolveCompleteAppointmentContext).not.toHaveBeenCalled();
    });
});
