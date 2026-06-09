import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppointmentStatus, AppointmentType } from '../../src/generated/prisma';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'appointment-service-test-secret';
process.env.FRONTEND_ORIGINS = '';
process.env.REDIS_URL = '';
process.env.INTERNAL_API_KEY = 'appointment-internal-test-key';

const { createApp } = require('../../src/app');
const {
    AppointmentPrismaRepository,
} = require('../../src/modules/appointments/infrastructure/appointment.prisma.repository');
const {
    SchedulePrismaRepository,
} = require('../../src/modules/schedules/infrastructure/schedule.prisma.repository');
const {
    PatientPrismaRepository,
} = require('../../src/modules/patients/infrastructure/patient.prisma.repository');
const {
    AppointmentAiClinicalContextService,
} = require('../../src/modules/appointments/services/appointment-ai-clinical-context.service');

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const serviceId = '6f817061-d12c-42d1-8d57-24a0ddbd8b82';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const scheduledAt = new Date('2030-01-02T09:00:00.000Z');
const endAt = new Date('2030-01-02T09:30:00.000Z');
const roles = ['Admin'];

const department = {
    id: departmentId,
    name: 'Cardiology',
    isActive: true,
};

const patient = {
    id: patientId,
    userId: 'b9fc5d6a-1af8-49a2-8467-2a60ceef7057',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@medsphere.local',
    phone: '+38344111222',
    name: 'Ada Lovelace',
};

const secondPatient = {
    id: '45974dde-783f-43a1-bcab-117d754f81e2',
    userId: 'c9fc5d6a-1af8-49a2-8467-2a60ceef7058',
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@medsphere.local',
    phone: '+38344111333',
    name: 'Grace Hopper',
};

const appointment = {
    id: appointmentId,
    patientId,
    departmentId,
    serviceCatalogId: serviceId,
    staffProfileId,
    status: AppointmentStatus.SCHEDULED,
    appointmentType: AppointmentType.IN_PERSON,
    scheduledAt,
    endAt,
    durationMinutes: 30,
    basePrice: 50,
    notes: null,
    checkedInAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationNote: null,
    createdAt: new Date('2026-05-19T08:00:00.000Z'),
    updatedAt: new Date('2026-05-19T08:00:00.000Z'),
    patient,
    staff: {
        id: staffProfileId,
        userId: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
        employeeCode: 'DR-001',
        specialization: 'Cardiologist',
        displayName: 'DR-001 - Cardiologist',
    },
    service: {
        id: serviceId,
        name: 'Initial Consultation',
        defaultDurationMinutes: 30,
        defaultPrice: 50,
    },
    department,
};

const patientProfile = {
    id: patientId,
    userId: null,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@medsphere.local',
    phone: '+38344111222',
    dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
    gender: 'female',
    bloodType: null,
    personalNumber: '1234567890',
    address: null,
    emergencyContact: null,
    emergencyPhone: null,
    allergies: null,
    medicalNotes: null,
    isActive: true,
    createdAt: new Date('2026-05-19T08:00:00.000Z'),
    updatedAt: new Date('2026-05-19T08:00:00.000Z'),
};

function createAccessToken(permissions: string[], subject = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee') {
    return jwt.sign(
        {
            sub: subject,
            email: 'admin@medsphere.local',
            roles,
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

function mockAvailabilityDependencies() {
    jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue({
        id: staffProfileId,
        employmentStatus: 'ACTIVE',
        departments: [
            {
                departmentId,
                unassignedAt: null,
                department,
            },
        ],
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
            dayOfWeek: scheduledAt.getUTCDay(),
            startTime: '09:00',
            endTime: '10:00',
            slotDurationMinutes: 30,
            breakStart: null,
            breakEnd: null,
            validFrom: null,
            validTo: null,
            isActive: true,
            createdAt: new Date('2026-05-19T08:00:00.000Z'),
            updatedAt: new Date('2026-05-19T08:00:00.000Z'),
        },
    ]);
    jest.spyOn(SchedulePrismaRepository.prototype, 'listWeeklySchedules').mockResolvedValue([
        {
            id: 'schedule-1',
            staffProfileId,
            departmentId,
            dayOfWeek: scheduledAt.getUTCDay(),
            startTime: '09:00',
            endTime: '10:00',
            slotDurationMinutes: 30,
            breakStart: null,
            breakEnd: null,
            validFrom: null,
            validTo: null,
            isActive: true,
            createdAt: new Date('2026-05-19T08:00:00.000Z'),
            updatedAt: new Date('2026-05-19T08:00:00.000Z'),
        },
    ]);
    jest.spyOn(SchedulePrismaRepository.prototype, 'listExceptionsForDate').mockResolvedValue([]);
    jest.spyOn(SchedulePrismaRepository.prototype, 'listBookedAppointments').mockResolvedValue([]);
}

describe('Appointment routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('books an appointment through POST /api/appointments', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientById').mockResolvedValue(patient);
        const findPatientByUserIdSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'findPatientByUserId')
            .mockResolvedValue(patient);
        const findPatientByIdOrUserIdSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'findPatientByIdOrUserId')
            .mockResolvedValue(patient);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffByIdOrUserId').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest
            .spyOn(AppointmentPrismaRepository.prototype, 'countConflictingAppointments')
            .mockResolvedValue(0);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'create').mockResolvedValue(appointment);
        mockAvailabilityDependencies();

        const response = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${createAccessToken(['appointments:create:all'], patient.userId!)}`)
            .send({
                serviceCatalogId: serviceId,
                staffProfileId,
                scheduledAt: scheduledAt.toISOString(),
                notes: ' New patient ',
            });

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(appointmentId);
        expect(response.body.patient.name).toBe('Ada Lovelace');
        expect(AppointmentPrismaRepository.prototype.create).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                serviceCatalogId: serviceId,
                staffProfileId,
                notes: 'New patient',
            }),
        );
        expect(findPatientByUserIdSpy).toHaveBeenCalledWith(patient.userId);
        expect(findPatientByIdOrUserIdSpy).not.toHaveBeenCalled();
    });

    it('books an appointment with the mobile payload', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientById').mockResolvedValue(patient);
        const findPatientByUserIdSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'findPatientByUserId')
            .mockResolvedValue(patient);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findDefaultServiceForStaff').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffByIdOrUserId').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest
            .spyOn(AppointmentPrismaRepository.prototype, 'countConflictingAppointments')
            .mockResolvedValue(0);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'create').mockResolvedValue({
            ...appointment,
            notes: 'General consultation',
        });
        mockAvailabilityDependencies();

        const response = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId!)}`)
            .send({
                doctorId: appointment.staff!.userId,
                date: scheduledAt.toISOString(),
                reason: 'General consultation',
            });

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(appointmentId);
        expect(response.body.doctorId).toBe(staffProfileId);
        expect(response.body.reason).toBe('General consultation');
        expect(AppointmentPrismaRepository.prototype.create).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                serviceCatalogId: serviceId,
                staffProfileId,
                notes: 'General consultation',
            }),
        );
        expect(findPatientByUserIdSpy).toHaveBeenCalledWith(patient.userId);
    });

    it('books a default-schedule slot for a mobile doctor with no usable saved schedule', async () => {
        const mobileScheduledAt = new Date('2030-06-03T12:30:00.000Z');
        const mobileEndAt = new Date('2030-06-03T13:00:00.000Z');
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientById')
            .mockResolvedValue(patient);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientByUserId')
            .mockResolvedValue(patient);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findDefaultServiceForStaff').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffByIdOrUserId').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'countConflictingAppointments')
            .mockResolvedValue(0);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'create').mockResolvedValue({
            ...appointment,
            scheduledAt: mobileScheduledAt,
            endAt: mobileEndAt,
            notes: 'General consultation',
        });
        jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfileId,
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(SchedulePrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: serviceId,
            departmentId,
            defaultDurationMinutes: 30,
            isActive: true,
        });
        jest.spyOn(SchedulePrismaRepository.prototype, 'listSchedulesForDay')
            .mockResolvedValue([]);
        jest.spyOn(SchedulePrismaRepository.prototype, 'listWeeklySchedules')
            .mockResolvedValue([
                {
                    id: 'inactive-schedule',
                    staffProfileId,
                    departmentId,
                    dayOfWeek: mobileScheduledAt.getUTCDay(),
                    startTime: '08:00',
                    endTime: '17:00',
                    slotDurationMinutes: 30,
                    breakStart: null,
                    breakEnd: null,
                    validFrom: null,
                    validTo: null,
                    isActive: false,
                    createdAt: new Date('2026-05-19T08:00:00.000Z'),
                    updatedAt: new Date('2026-05-19T08:00:00.000Z'),
                },
            ]);
        jest.spyOn(SchedulePrismaRepository.prototype, 'listExceptionsForDate')
            .mockResolvedValue([]);
        jest.spyOn(SchedulePrismaRepository.prototype, 'listBookedAppointments')
            .mockResolvedValue([]);

        const response = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId!)}`)
            .send({
                doctorId: staffProfileId,
                date: mobileScheduledAt.toISOString(),
                reason: 'General consultation',
            });

        expect(response.status).toBe(201);
        expect(AppointmentPrismaRepository.prototype.create).toHaveBeenCalledWith(
            expect.objectContaining({
                scheduledAt: mobileScheduledAt,
                endAt: mobileEndAt,
                notes: 'General consultation',
            }),
        );
    });

    it('keeps booked doctor slots unavailable globally across different patients', async () => {
        const mobileScheduledAt = new Date('2030-06-03T12:30:00.000Z');
        const mobileEndAt = new Date('2030-06-03T13:00:00.000Z');
        const bookedAppointments: Array<{ scheduledAt: Date; endAt: Date }> = [];

        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientById')
            .mockImplementation(async (...args: unknown[]) => {
                const id = args[0] as string;
                if (id === patient.id) return patient;
                if (id === secondPatient.id) return secondPatient;
                return null;
            });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientByUserId')
            .mockImplementation(async (...args: unknown[]) => {
                const userId = args[0] as string;
                if (userId === patient.userId) return patient;
                if (userId === secondPatient.userId) return secondPatient;
                return null;
            });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findDefaultServiceForStaff').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffByIdOrUserId').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'countConflictingAppointments')
            .mockImplementation(async (...args: unknown[]) => {
                const filters = args[0] as { scheduledAt: Date; endAt: Date };
                return bookedAppointments.some(
                    (slot) => filters.scheduledAt < slot.endAt && filters.endAt > slot.scheduledAt,
                ) ? 1 : 0;
            });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'create').mockImplementation(async (data: any) => {
            bookedAppointments.push({
                scheduledAt: data.scheduledAt,
                endAt: data.endAt,
            });

            return {
                ...appointment,
                id: 'booked-by-patient-a',
                patientId: data.patientId,
                patient,
                scheduledAt: data.scheduledAt,
                endAt: data.endAt,
                notes: data.notes,
            };
        });
        jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfileId,
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(SchedulePrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: serviceId,
            departmentId,
            defaultDurationMinutes: 30,
            isActive: true,
        });
        jest.spyOn(SchedulePrismaRepository.prototype, 'listSchedulesForDay')
            .mockResolvedValue([]);
        jest.spyOn(SchedulePrismaRepository.prototype, 'listWeeklySchedules')
            .mockResolvedValue([]);
        jest.spyOn(SchedulePrismaRepository.prototype, 'listExceptionsForDate')
            .mockResolvedValue([]);
        jest.spyOn(SchedulePrismaRepository.prototype, 'listBookedAppointments')
            .mockImplementation(async () => bookedAppointments);

        const userABooking = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId!)}`)
            .send({
                doctorId: staffProfileId,
                date: mobileScheduledAt.toISOString(),
                reason: 'General consultation',
            });

        expect(userABooking.status).toBe(201);

        const userBSlots = await request(app)
            .get(`/api/staff/doctors/${staffProfileId}/available-slots?date=2030-06-03`);

        expect(userBSlots.status).toBe(200);
        expect(userBSlots.body.slots.map((slot: { startTime: string }) => slot.startTime))
            .not
            .toContain('12:30');

        const userBBooking = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${createAccessToken([], secondPatient.userId!)}`)
            .send({
                doctorId: staffProfileId,
                date: mobileScheduledAt.toISOString(),
                reason: 'General consultation',
            });

        expect(userBBooking.status).toBe(409);
        expect(userBBooking.body.message).toBe('This appointment slot is already booked.');
    });

    it('ignores patientId in the booking body and uses the authenticated patient', async () => {
        const findPatientByUserIdSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'findPatientByUserId')
            .mockResolvedValue(patient);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientById').mockResolvedValue(patient);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findDefaultServiceForStaff').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffByIdOrUserId').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest
            .spyOn(AppointmentPrismaRepository.prototype, 'countConflictingAppointments')
            .mockResolvedValue(0);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'create').mockResolvedValue(appointment);
        mockAvailabilityDependencies();

        const response = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId!)}`)
            .send({
                patientId: '11111111-1111-4111-8111-111111111111',
                doctorId: appointment.staff!.userId,
                date: scheduledAt.toISOString(),
                reason: 'General consultation',
            });

        expect(response.status).toBe(201);
        expect(findPatientByUserIdSpy).toHaveBeenCalledWith(patient.userId);
        expect(AppointmentPrismaRepository.prototype.create).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
            }),
        );
    });

    it('returns 404 when the authenticated user has no active patient', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientByUserId')
            .mockResolvedValue(null);
        const createSpy = jest.spyOn(AppointmentPrismaRepository.prototype, 'create');

        const response = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId!)}`)
            .send({
                doctorId: appointment.staff!.userId,
                date: scheduledAt.toISOString(),
                reason: 'General consultation',
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Patient not found or inactive');
        expect(AppointmentPrismaRepository.prototype.findPatientByUserId)
            .toHaveBeenCalledWith(patient.userId);
        expect(createSpy).not.toHaveBeenCalled();
    });

    it('does not expose public appointment booking without an auth token', async () => {
        const patientCreateSpy = jest.spyOn(PatientPrismaRepository.prototype, 'create');
        const appointmentCreateSpy = jest.spyOn(AppointmentPrismaRepository.prototype, 'create');

        const response = await request(app)
            .post('/api/public/appointments')
            .send({
                patient: {
                    firstName: 'Ada',
                    lastName: 'Lovelace',
                    email: 'ada@medsphere.local',
                    phone: '+38344111222',
                    personalNumber: '1234567890',
                    dateOfBirth: '1990-01-01',
                    gender: 'female',
                },
                serviceCatalogId: serviceId,
                staffProfileId,
                scheduledAt: scheduledAt.toISOString(),
                notes: 'Website request',
            });

        expect(response.status).toBe(404);
        expect(patientCreateSpy).not.toHaveBeenCalled();
        expect(appointmentCreateSpy).not.toHaveBeenCalled();
    });

    it('returns privacy-safe AI clinical context for an internal appointment lookup', async () => {
        jest
            .spyOn(AppointmentAiClinicalContextService.prototype, 'getByAppointmentId')
            .mockResolvedValue({
                appointment: {
                    id: appointmentId,
                    appointmentType: 'IN_PERSON',
                    scheduledAt,
                    department: 'Cardiology',
                    service: 'Initial Consultation',
                    staffSpecialization: 'Cardiologist',
                },
                patient: {
                    gender: 'female',
                    bloodType: 'A_POSITIVE',
                    allergies: ['penicillin'],
                    medicalNotes: { chronicConditions: ['asthma'] },
                },
                recentMedicalRecords: [
                    {
                        createdAt: new Date('2029-12-20T10:00:00.000Z'),
                        department: 'Cardiology',
                        chiefComplaint: 'Chest discomfort',
                        diagnosis: 'Stable exam',
                        treatmentPlan: 'Monitor symptoms',
                        followUpInstructions: 'Follow up in two weeks',
                    },
                ],
                recentPrescriptions: [
                    {
                        issuedAt: new Date('2029-12-20T10:10:00.000Z'),
                        status: 'ACTIVE',
                        diagnosis: 'Stable exam',
                        items: [
                            {
                                medicationName: 'Aspirin',
                                dosage: '81 mg',
                                frequency: 'Once daily',
                                durationInstructions: '30 days',
                                notes: null,
                            },
                        ],
                    },
                ],
            });

        const response = await request(app)
            .get(`/internal/appointments/${appointmentId}/ai-clinical-context`)
            .set('x-internal-api-key', process.env.INTERNAL_API_KEY as string);

        expect(response.status).toBe(200);
        expect(response.body.patient.allergies).toEqual(['penicillin']);
        expect(response.body.recentPrescriptions[0].items[0].medicationName).toBe('Aspirin');
        expect(JSON.stringify(response.body)).not.toContain('Ada');
        expect(JSON.stringify(response.body)).not.toContain('ada@medsphere.local');
        expect(JSON.stringify(response.body)).not.toContain('+38344111222');
    });

    it('rejects public appointment booking after the public flow is removed', async () => {
        const appointmentCreateSpy = jest.spyOn(AppointmentPrismaRepository.prototype, 'create');

        const response = await request(app)
            .post('/api/public/appointments')
            .send({
                patient: {
                    firstName: 'Ada',
                    lastName: 'Lovelace',
                    email: 'ada@medsphere.local',
                    phone: '+38344111222',
                    personalNumber: '1234567890',
                    dateOfBirth: '1990-01-01',
                    gender: 'female',
                },
                serviceCatalogId: serviceId,
                staffProfileId,
                scheduledAt: scheduledAt.toISOString(),
                notes: 'Website request',
            });

        expect(response.status).toBe(404);
        expect(appointmentCreateSpy).not.toHaveBeenCalled();
    });

    it('lists appointments with filters', async () => {
        const listSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [appointment],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get(`/api/appointments?date=2030-01-02&staffId=${staffProfileId}&status=SCHEDULED`)
            .set('Authorization', `Bearer ${createAccessToken(['appointments:read:all'])}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                page: 1,
                limit: 10,
                staffId: staffProfileId,
                status: AppointmentStatus.SCHEDULED,
            }),
        );
    });

    it('supports the patient dashboard upcoming appointment query', async () => {
        const listSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [appointment],
                meta: {
                    page: 1,
                    limit: 3,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get(
                `/api/appointments?patientId=${patientId}&from=2030-01-01T00:00:00.000Z&limit=3`,
            )
            .set('Authorization', `Bearer ${createAccessToken(['appointments:read:all'])}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                page: 1,
                limit: 3,
                patientId,
                from: new Date('2030-01-01T00:00:00.000Z'),
            }),
        );
    });

    it('lists appointments for the authenticated patient through GET /api/appointments/my', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientByIdOrUserId').mockResolvedValue(patient);
        const listSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [appointment],
                meta: {
                    page: 1,
                    limit: 100,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get('/api/appointments/my')
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId!)}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].doctorId).toBe(staffProfileId);
        expect(response.body.items[0].doctor).toEqual(expect.objectContaining({
            id: staffProfileId,
            specialty: 'Cardiologist',
        }));
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                limit: 100,
            }),
        );
    });

    it('lists appointments for the authenticated doctor through GET /api/appointments/doctor/my', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffByIdOrUserId').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [],
        });
        const listSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [appointment],
                meta: {
                    page: 1,
                    limit: 100,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get('/api/appointments/doctor/my')
            .set('Authorization', `Bearer ${createAccessToken([], appointment.staff!.userId)}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                staffId: staffProfileId,
                limit: 100,
            }),
        );
    });

    it('supports completed appointments without feedback prompts', async () => {
        const completedAppointment = {
            ...appointment,
            status: AppointmentStatus.COMPLETED,
            completedAt: new Date('2030-01-02T09:30:00.000Z'),
        };
        const listSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'list')
            .mockResolvedValue({
                items: [completedAppointment],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get(
                `/api/appointments?patientId=${patientId}&status=COMPLETED&hasNoFeedback=true`,
            )
            .set('Authorization', `Bearer ${createAccessToken(['appointments:read:all'])}`);

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                status: AppointmentStatus.COMPLETED,
                hasNoFeedback: true,
            }),
        );
    });

    it('updates appointment status through PATCH /api/appointments/:id/status', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findById').mockResolvedValue(appointment);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'updateStatus').mockResolvedValue({
            ...appointment,
            status: AppointmentStatus.CONFIRMED,
        });

        const response = await request(app)
            .patch(`/api/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${createAccessToken(['appointments:update:all'])}`)
            .send({ action: 'confirm' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(AppointmentStatus.CONFIRMED);
        expect(AppointmentPrismaRepository.prototype.updateStatus).toHaveBeenCalledWith(
            appointmentId,
            expect.objectContaining({
                status: AppointmentStatus.CONFIRMED,
            }),
        );
    });

    it('cancels an appointment with the mobile status payload', async () => {
        const updateStatusSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'updateStatus')
            .mockResolvedValue({
                ...appointment,
                status: AppointmentStatus.CANCELLED,
                cancelledAt: new Date('2030-01-01T08:00:00.000Z'),
                cancellationNote: 'Cancelled by user',
            });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findById').mockResolvedValue(appointment);

        const response = await request(app)
            .patch(`/api/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId!)}`)
            .send({ status: 'CANCELLED' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(AppointmentStatus.CANCELLED);
        expect(updateStatusSpy).toHaveBeenCalledWith(
            appointmentId,
            expect.objectContaining({
                status: AppointmentStatus.CANCELLED,
                cancellationNote: 'Cancelled by user',
            }),
        );
    });

    it('reschedules an own appointment with the mobile date payload', async () => {
        const newStart = new Date('2030-01-02T09:30:00.000Z');
        const newEnd = new Date('2030-01-02T10:00:00.000Z');
        const rescheduleSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'reschedule')
            .mockResolvedValue({
                ...appointment,
                scheduledAt: newStart,
                endAt: newEnd,
            });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findById').mockResolvedValue(appointment);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest
            .spyOn(AppointmentPrismaRepository.prototype, 'countConflictingAppointments')
            .mockResolvedValue(0);
        mockAvailabilityDependencies();

        const response = await request(app)
            .patch(`/api/appointments/${appointmentId}`)
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId!)}`)
            .send({ date: newStart.toISOString() });

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(appointmentId);
        expect(response.body.doctorId).toBe(staffProfileId);
        expect(response.body.date).toBe(newStart.toISOString());
        expect(rescheduleSpy).toHaveBeenCalledWith(
            appointmentId,
            expect.objectContaining({
                staffProfileId,
                scheduledAt: newStart,
                endAt: newEnd,
            }),
        );
    });

    it('reschedules a patient appointment through PATCH /api/appointments/:id/reschedule', async () => {
        const newStart = new Date('2030-01-02T09:30:00.000Z');
        const newEnd = new Date('2030-01-02T10:00:00.000Z');
        const patientSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'findPatientByIdOrUserId')
            .mockResolvedValue(patient);
        const staffSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'findStaffByIdOrUserId')
            .mockResolvedValue({
                id: staffProfileId,
                userId: appointment.staff!.userId,
                employeeCode: 'DR-001',
                specialization: 'Cardiologist',
                employmentStatus: 'ACTIVE',
                departments: [
                    {
                        departmentId,
                        unassignedAt: null,
                        department,
                    },
                ],
            });
        const rescheduleSpy = jest
            .spyOn(AppointmentPrismaRepository.prototype, 'reschedule')
            .mockResolvedValue({
                ...appointment,
                scheduledAt: newStart,
                endAt: newEnd,
            });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findById').mockResolvedValue(appointment);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findServiceById').mockResolvedValue({
            id: serviceId,
            departmentId,
            name: 'Initial Consultation',
            defaultDurationMinutes: 30,
            defaultPrice: 50,
            isActive: true,
            department,
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            id: staffProfileId,
            userId: appointment.staff!.userId,
            employeeCode: 'DR-001',
            specialization: 'Cardiologist',
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest
            .spyOn(AppointmentPrismaRepository.prototype, 'countConflictingAppointments')
            .mockResolvedValue(0);
        mockAvailabilityDependencies();

        const response = await request(app)
            .patch(`/api/appointments/${appointmentId}/reschedule`)
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId!)}`)
            .send({
                doctorId: staffProfileId,
                date: newStart.toISOString(),
            });

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(appointmentId);
        expect(response.body.doctorId).toBe(staffProfileId);
        expect(response.body.date).toBe(newStart.toISOString());
        expect(patientSpy).toHaveBeenCalledWith(patient.userId);
        expect(staffSpy).toHaveBeenCalledWith(staffProfileId);
        expect(rescheduleSpy).toHaveBeenCalledWith(
            appointmentId,
            expect.objectContaining({
                staffProfileId,
                scheduledAt: newStart,
                endAt: newEnd,
            }),
        );
    });

    it('rejects patient reschedule when doctorId is not the appointment doctor', async () => {
        const otherDoctorId = '28eb5cb0-0000-4000-8000-000000000001';
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientByIdOrUserId')
            .mockResolvedValue(patient);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findById').mockResolvedValue(appointment);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffByIdOrUserId')
            .mockResolvedValue({
                id: otherDoctorId,
                userId: '28eb5cb0-0000-4000-8000-000000000002',
                employeeCode: 'DR-002',
                specialization: 'General Medicine',
                employmentStatus: 'ACTIVE',
                departments: [],
            });
        const rescheduleSpy = jest.spyOn(AppointmentPrismaRepository.prototype, 'reschedule');

        const response = await request(app)
            .patch(`/api/appointments/${appointmentId}/reschedule`)
            .set('Authorization', `Bearer ${createAccessToken([], patient.userId!)}`)
            .send({
                doctorId: otherDoctorId,
                date: '2030-01-02T09:30:00.000Z',
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Appointment can only be rescheduled with the same doctor');
        expect(rescheduleSpy).not.toHaveBeenCalled();
    });
});
