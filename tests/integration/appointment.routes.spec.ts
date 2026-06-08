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

function createAccessToken(
    permissions: string[],
    sub = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
    roles = ['Admin'],
) {
    return jwt.sign(
        {
            sub,
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
        jest.spyOn(AppointmentPrismaRepository.prototype, 'create').mockResolvedValue(appointment);
        mockAvailabilityDependencies();

        const response = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${createAccessToken(['appointments:create:all'])}`)
            .send({
                patientId,
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

    it('books a public appointment without an auth token', async () => {
        jest.spyOn(PatientPrismaRepository.prototype, 'findByPersonalNumberHash').mockResolvedValue(null);
        jest.spyOn(PatientPrismaRepository.prototype, 'findByEmail').mockResolvedValue(null);
        jest.spyOn(PatientPrismaRepository.prototype, 'create').mockResolvedValue(patientProfile);
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
        jest.spyOn(AppointmentPrismaRepository.prototype, 'create').mockResolvedValue(appointment);
        mockAvailabilityDependencies();

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

        expect(response.status).toBe(201);
        expect(response.body.id).toBe(appointmentId);
        expect(PatientPrismaRepository.prototype.create).toHaveBeenCalledWith(
            expect.objectContaining({
                firstName: 'Ada',
                lastName: 'Lovelace',
                email: 'ada@medsphere.local',
                phone: '+38344111222',
                personalNumber: expect.stringMatching(/^enc:/),
                personalNumberHash: expect.any(String),
            }),
        );
        expect(AppointmentPrismaRepository.prototype.create).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                serviceCatalogId: serviceId,
                staffProfileId,
                notes: 'Website request',
            }),
        );
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

    it('lets a patient reschedule their own appointment with own-scoped update permission', async () => {
        const nextScheduledAt = new Date('2030-01-02T09:30:00.000Z');
        const nextEndAt = new Date('2030-01-02T10:00:00.000Z');

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
        jest.spyOn(AppointmentPrismaRepository.prototype, 'reschedule').mockResolvedValue({
            ...appointment,
            scheduledAt: nextScheduledAt,
            endAt: nextEndAt,
        });
        mockAvailabilityDependencies();

        const response = await request(app)
            .put(`/api/appointments/${appointmentId}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['appointments:update:own'], patient.userId!, ['Patient'])}`,
            )
            .send({ scheduledAt: nextScheduledAt.toISOString() });

        expect(response.status).toBe(200);
        expect(response.body.scheduledAt).toBe(nextScheduledAt.toISOString());
        expect(AppointmentPrismaRepository.prototype.reschedule).toHaveBeenCalledWith(
            appointmentId,
            expect.objectContaining({
                scheduledAt: nextScheduledAt,
                endAt: nextEndAt,
            }),
        );
    });

    it('blocks a patient from rescheduling another patient appointment', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findById').mockResolvedValue(appointment);
        const rescheduleSpy = jest.spyOn(AppointmentPrismaRepository.prototype, 'reschedule');

        const response = await request(app)
            .put(`/api/appointments/${appointmentId}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['appointments:update:own'], 'other-patient-user', ['Patient'])}`,
            )
            .send({ scheduledAt: '2030-01-02T09:30:00.000Z' });

        expect(response.status).toBe(403);
        expect(rescheduleSpy).not.toHaveBeenCalled();
    });

    it('blocks own-scoped patients from non-cancel status updates', async () => {
        const updateStatusSpy = jest.spyOn(AppointmentPrismaRepository.prototype, 'updateStatus');

        const response = await request(app)
            .patch(`/api/appointments/${appointmentId}/status`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['appointments:update:own'], patient.userId!, ['Patient'])}`,
            )
            .send({ action: 'confirm' });

        expect(response.status).toBe(403);
        expect(updateStatusSpy).not.toHaveBeenCalled();
    });

    it('lets a patient cancel their own appointment with own-scoped cancel permission', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findById').mockResolvedValue(appointment);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'updateStatus').mockResolvedValue({
            ...appointment,
            status: AppointmentStatus.CANCELLED,
            cancelledAt: new Date('2030-01-01T12:00:00.000Z'),
            cancellationNote: 'Need to move',
        });

        const response = await request(app)
            .patch(`/api/appointments/${appointmentId}/status`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['appointments:cancel:own'], patient.userId!, ['Patient'])}`,
            )
            .send({ action: 'cancel', reason: 'Need to move' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(AppointmentStatus.CANCELLED);
        expect(AppointmentPrismaRepository.prototype.updateStatus).toHaveBeenCalledWith(
            appointmentId,
            expect.objectContaining({
                status: AppointmentStatus.CANCELLED,
                cancellationNote: 'Need to move',
            }),
        );
    });

    it('blocks a patient from cancelling another patient appointment', async () => {
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findById').mockResolvedValue(appointment);
        const updateStatusSpy = jest.spyOn(AppointmentPrismaRepository.prototype, 'updateStatus');

        const response = await request(app)
            .patch(`/api/appointments/${appointmentId}/status`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['appointments:cancel:own'], 'other-patient-user', ['Patient'])}`,
            )
            .send({ action: 'cancel', reason: 'Need to move' });

        expect(response.status).toBe(403);
        expect(updateStatusSpy).not.toHaveBeenCalled();
    });
});
