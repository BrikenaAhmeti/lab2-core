import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppointmentStatus, AppointmentType } from '../../src/generated/prisma';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'appointment-service-test-secret';
process.env.FRONTEND_ORIGINS = '';
process.env.REDIS_URL = '';

const { createApp } = require('../../src/app');
const {
    AppointmentPrismaRepository,
} = require('../../src/modules/appointments/infrastructure/appointment.prisma.repository');
const {
    SchedulePrismaRepository,
} = require('../../src/modules/schedules/infrastructure/schedule.prisma.repository');

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

function createAccessToken(permissions: string[]) {
    return jwt.sign(
        {
            sub: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
            email: 'admin@medsphere.local',
            roles: ['Admin'],
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
});
