import request from 'supertest';
import { AppointmentStatus, AppointmentType } from '../../src/generated/prisma';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_API_KEY = 'vapi-tools-test-key';
process.env.JWT_ACCESS_SECRET = 'vapi-tools-test-secret';
process.env.REDIS_URL = '';

const { createApp } = require('../../src/app');
const {
    VapiAppointmentPrismaRepository,
} = require('../../src/modules/appointments/infrastructure/vapi-appointment.prisma.repository');
const {
    AppointmentPrismaRepository,
} = require('../../src/modules/appointments/infrastructure/appointment.prisma.repository');
const {
    InMemoryAppointmentSlotLockRepository,
} = require('../../src/modules/appointments/infrastructure/appointment-slot-lock.repository');
const {
    SchedulePrismaRepository,
} = require('../../src/modules/schedules/infrastructure/schedule.prisma.repository');

const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const serviceId = '6f817061-d12c-42d1-8d57-24a0ddbd8b82';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const start = new Date('2030-01-02T09:00:00.000Z');
const end = new Date('2030-01-02T09:30:00.000Z');

const department = {
    id: departmentId,
    name: 'General Medicine',
    isActive: true,
};

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

const patient = {
    id: patientId,
    firstName: 'Ariana',
    lastName: 'Berisha',
    email: 'ariana@example.com',
    phone: '+38344111222',
    personalNumber: '1234567890',
};

const appointment = {
    id: appointmentId,
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
    createdAt: new Date('2030-01-01T08:00:00.000Z'),
    updatedAt: new Date('2030-01-01T08:00:00.000Z'),
    patient: {
        id: patientId,
        userId: null,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        name: 'Ariana Berisha',
    },
    staff: {
        id: staffProfileId,
        userId: doctor.userId,
        employeeCode: doctor.employeeCode,
        specialization: doctor.specialization,
        displayName: 'DR-001 - Family Medicine',
    },
    service: {
        id: serviceId,
        name: service.name,
        defaultDurationMinutes: 30,
        defaultPrice: 40,
    },
    department,
};

function postTool(toolName: string, args: Record<string, unknown>) {
    return request(app)
        .post('/internal/appointments/vapi/tools')
        .set('x-internal-api-key', 'vapi-tools-test-key')
        .send({ toolName, arguments: args });
}

function mockResolverData() {
    jest.spyOn(VapiAppointmentPrismaRepository.prototype, 'searchDoctors')
        .mockResolvedValue([doctor]);
    jest.spyOn(VapiAppointmentPrismaRepository.prototype, 'searchServices')
        .mockResolvedValue([service]);
    jest.spyOn(VapiAppointmentPrismaRepository.prototype, 'searchDepartments')
        .mockResolvedValue([{ id: departmentId, name: department.name }]);
}

function mockAvailabilityData(options: {
    scheduleEnd?: string;
    booked?: Array<{ scheduledAt: Date; endAt: Date }>;
    locked?: Array<{ start: Date; end: Date }>;
} = {}) {
    jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue({
        id: staffProfileId,
        employmentStatus: 'ACTIVE',
        departments: [{ departmentId, unassignedAt: null, department }],
    });
    jest.spyOn(SchedulePrismaRepository.prototype, 'findServiceById').mockResolvedValue({
        id: serviceId,
        departmentId,
        defaultDurationMinutes: 30,
        isActive: true,
    });
    jest.spyOn(SchedulePrismaRepository.prototype, 'listSchedulesForDay').mockResolvedValue([
        {
            id: 'schedule-1',
            staffProfileId,
            departmentId,
            dayOfWeek: start.getUTCDay(),
            startTime: '09:00',
            endTime: options.scheduleEnd ?? '10:00',
            slotDurationMinutes: 30,
            breakStart: null,
            breakEnd: null,
            validFrom: null,
            validTo: null,
            isActive: true,
            createdAt: new Date('2030-01-01T00:00:00.000Z'),
            updatedAt: new Date('2030-01-01T00:00:00.000Z'),
        },
    ]);
    jest.spyOn(SchedulePrismaRepository.prototype, 'listExceptionsForDate')
        .mockResolvedValue([]);
    jest.spyOn(SchedulePrismaRepository.prototype, 'listBookedAppointments')
        .mockResolvedValue(options.booked ?? []);
    jest.spyOn(InMemoryAppointmentSlotLockRepository.prototype, 'findLockedSlots')
        .mockResolvedValue(options.locked ?? []);
}

function mockBookingData() {
    mockResolverData();
    mockAvailabilityData();
    jest.spyOn(VapiAppointmentPrismaRepository.prototype, 'findPatientByPersonalNumber')
        .mockResolvedValue(patient);
    jest.spyOn(VapiAppointmentPrismaRepository.prototype, 'createPatient')
        .mockResolvedValue(patient);
    jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientById').mockResolvedValue({
        id: patientId,
        userId: null,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        name: 'Ariana Berisha',
    });
    jest.spyOn(AppointmentPrismaRepository.prototype, 'findServiceById').mockResolvedValue({
        id: serviceId,
        departmentId,
        name: service.name,
        defaultDurationMinutes: 30,
        defaultPrice: 40,
        isActive: true,
        department,
    });
    jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffById').mockResolvedValue({
        id: staffProfileId,
        userId: doctor.userId,
        employeeCode: doctor.employeeCode,
        specialization: doctor.specialization,
        employmentStatus: 'ACTIVE',
        departments: [{ departmentId, unassignedAt: null, department }],
    });
    jest.spyOn(AppointmentPrismaRepository.prototype, 'countConflictingAppointments')
        .mockResolvedValue(0);
    jest.spyOn(AppointmentPrismaRepository.prototype, 'create').mockResolvedValue(appointment);
    jest.spyOn(InMemoryAppointmentSlotLockRepository.prototype, 'acquireSlotLock')
        .mockResolvedValue(true);
    jest.spyOn(InMemoryAppointmentSlotLockRepository.prototype, 'releaseSlotLock')
        .mockResolvedValue(undefined);
}

const app = createApp();

describe('Vapi appointment tool routes', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('doctor name resolves to doctorId', async () => {
        mockResolverData();

        const response = await postTool('resolveAppointmentContext', {
            doctorName: 'Arben Krasniqi',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.resolved.doctorId).toBe(staffProfileId);
        expect(response.body.resolved.doctorName).toBe('Dr. Arben Krasniqi');
    });

    it('service name resolves to serviceId and departmentId', async () => {
        mockResolverData();

        const response = await postTool('resolveAppointmentContext', {
            serviceName: 'General Consultation',
        });

        expect(response.status).toBe(200);
        expect(response.body.resolved).toMatchObject({
            serviceId,
            departmentId,
            departmentName: department.name,
        });
    });

    it('multiple doctor matches return clarification', async () => {
        jest.spyOn(VapiAppointmentPrismaRepository.prototype, 'searchDoctors')
            .mockResolvedValue([
                doctor,
                {
                    ...doctor,
                    id: '1a9e2502-844c-4a75-9c79-7d4f8187a871',
                    displayName: 'Dr. Arben Gashi',
                    departments: [{ id: departmentId, name: 'Cardiology', isPrimary: true }],
                },
            ]);

        const response = await postTool('resolveAppointmentContext', {
            doctorName: 'Arben',
        });

        expect(response.status).toBe(200);
        expect(response.body.needsClarification).toBe(true);
        expect(response.body.options).toEqual([
            { type: 'doctor', label: 'Dr. Arben Krasniqi, General Medicine' },
            { type: 'doctor', label: 'Dr. Arben Gashi, Cardiology' },
        ]);
    });

    it('personal number is required for booking', async () => {
        const response = await postTool('bookAppointment', {
            doctorName: 'Arben Krasniqi',
            serviceName: service.name,
            startTime: '2030-01-02T09:00:00+01:00',
            patientFirstName: 'Ariana',
            patientLastName: 'Berisha',
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: false,
            message: 'Personal number is required.',
        });
    });

    it('existing patient found by personal number', async () => {
        mockBookingData();

        const response = await postTool('bookAppointment', bookingPayload());

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(
            VapiAppointmentPrismaRepository.prototype.findPatientByPersonalNumber,
        ).toHaveBeenCalledWith('1234567890');
        expect(VapiAppointmentPrismaRepository.prototype.createPatient).not.toHaveBeenCalled();
    });

    it('new patient created with personal number', async () => {
        mockBookingData();
        jest.spyOn(VapiAppointmentPrismaRepository.prototype, 'findPatientByPersonalNumber')
            .mockResolvedValue(null);

        const response = await postTool('bookAppointment', bookingPayload());

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(VapiAppointmentPrismaRepository.prototype.createPatient).toHaveBeenCalledWith(
            expect.objectContaining({
                firstName: 'Ariana',
                lastName: 'Berisha',
                personalNumber: '1234567890',
            }),
        );
    });

    it('available slot returns true', async () => {
        mockResolverData();
        mockAvailabilityData();

        const response = await postTool('checkAvailability', {
            doctorName: 'Arben Krasniqi',
            serviceName: service.name,
            date: '2030-01-02',
        });

        expect(response.status).toBe(200);
        expect(response.body.available).toBe(true);
        expect(response.body.resolvedDate).toBe('2030-01-02');
        expect(response.body.slots[0]).toMatchObject({
            label: '09:00',
            startTime: '2030-01-02T09:00:00+01:00',
            endTime: '2030-01-02T09:30:00+01:00',
        });
    });

    it('booked slot returns unavailable', async () => {
        mockResolverData();
        mockAvailabilityData({
            scheduleEnd: '09:30',
            booked: [{ scheduledAt: start, endAt: end }],
        });

        const response = await postTool('checkAvailability', {
            doctorName: 'Arben Krasniqi',
            serviceName: service.name,
            date: '2030-01-02',
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: true,
            available: false,
            slots: [],
        });
    });

    it('Redis locked slot is removed', async () => {
        mockResolverData();
        mockAvailabilityData({ locked: [{ start, end }] });

        const response = await postTool('checkAvailability', {
            doctorName: 'Arben Krasniqi',
            serviceName: service.name,
            date: '2030-01-02',
        });

        expect(response.status).toBe(200);
        expect(response.body.available).toBe(true);
        expect(response.body.slots.map((slot: { label: string }) => slot.label)).toEqual([
            '09:30',
        ]);
    });

    it('booking same slot twice returns conflict', async () => {
        mockBookingData();
        jest.spyOn(InMemoryAppointmentSlotLockRepository.prototype, 'acquireSlotLock')
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);

        const first = await postTool('bookAppointment', bookingPayload());
        const second = await postTool('bookAppointment', bookingPayload());

        expect(first.body.success).toBe(true);
        expect(second.body).toMatchObject({
            success: false,
            message: 'This time is no longer available. Please choose another time.',
        });
    });

    it('past date booking is rejected', async () => {
        const response = await postTool('bookAppointment', {
            ...bookingPayload(),
            startTime: '2020-01-02T09:00:00+01:00',
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: false,
            message: 'Past appointments cannot be booked. Please choose a future time.',
        });
    });

    it('normalizes spoken patient email, phone and personal number before creating a patient', async () => {
        mockBookingData();
        jest.spyOn(VapiAppointmentPrismaRepository.prototype, 'findPatientByPersonalNumber')
            .mockResolvedValue(null);

        const response = await postTool('bookAppointment', {
            ...bookingPayload(),
            personalNumber: '1 2,3.4 plus 5 6 7 8 9 0',
            patientPhone: 'plus 383 44,111.222',
            patientEmail: 'Ariana at Example dot COM',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(VapiAppointmentPrismaRepository.prototype.findPatientByPersonalNumber)
            .toHaveBeenCalledWith('1234567890');
        expect(VapiAppointmentPrismaRepository.prototype.createPatient)
            .toHaveBeenCalledWith(
                expect.objectContaining({
                    personalNumber: '1234567890',
                    phone: '38344111222',
                    email: 'ariana@example.com',
                }),
            );
    });

    it('rejects incomplete personal numbers', async () => {
        const response = await postTool('bookAppointment', {
            ...bookingPayload(),
            personalNumber: '12 3',
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: false,
            message: 'The personal number seems incomplete. Please provide it again.',
        });
    });

    it('rejects booking with a non-Belgrade ISO offset', async () => {
        const response = await postTool('bookAppointment', {
            ...bookingPayload(),
            startTime: '2030-01-02T09:00:00+02:00',
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: false,
            message: 'Please choose a valid future appointment start time from the available slots.',
        });
    });

    it('rejects booking when startTime is not the exact slot value', async () => {
        mockBookingData();

        const response = await postTool('bookAppointment', {
            ...bookingPayload(),
            startTime: '2030-01-02T09:00+01:00',
        });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            success: false,
            message: 'This time is no longer available. Please choose another time.',
        });
    });
});

function bookingPayload() {
    return {
        doctorName: 'Arben Krasniqi',
        serviceName: service.name,
        startTime: '2030-01-02T09:00:00+01:00',
        personalNumber: '1234567890',
        patientFirstName: 'Ariana',
        patientLastName: 'Berisha',
        patientPhone: '+38344111222',
        patientEmail: 'ariana@example.com',
    };
}
