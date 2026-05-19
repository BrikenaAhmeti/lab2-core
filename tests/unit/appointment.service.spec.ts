import { AppointmentStatus, AppointmentType } from '../../src/generated/prisma';
import { AppointmentAuditLogger } from '../../src/modules/appointments/domain/appointment-audit.logger';
import { AppointmentEventPublisher } from '../../src/modules/appointments/domain/appointment-event.publisher';
import { AppointmentRepository } from '../../src/modules/appointments/domain/appointment.repository';
import { AppointmentSlotLockRepository } from '../../src/modules/appointments/domain/appointment-slot-lock.repository';
import { AppointmentService } from '../../src/modules/appointments/services/appointment.service';
import { ScheduleService } from '../../src/modules/schedules/services/schedule.service';

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const serviceId = '6f817061-d12c-42d1-8d57-24a0ddbd8b82';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const scheduledAt = new Date('2026-05-20T09:00:00.000Z');
const endAt = new Date('2026-05-20T09:30:00.000Z');

const patient = {
    id: patientId,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@medsphere.local',
    phone: '+38344111222',
    name: 'Ada Lovelace',
};

const department = {
    id: departmentId,
    name: 'Cardiology',
    isActive: true,
};

const serviceCatalog = {
    id: serviceId,
    departmentId,
    name: 'Initial Consultation',
    defaultDurationMinutes: 30,
    defaultPrice: 50,
    isActive: true,
    department,
};

const staff = {
    id: staffProfileId,
    userId: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
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
        userId: staff.userId,
        employeeCode: staff.employeeCode,
        specialization: staff.specialization,
        displayName: 'DR-001 - Cardiologist',
    },
    service: {
        id: serviceId,
        name: serviceCatalog.name,
        defaultDurationMinutes: 30,
        defaultPrice: 50,
    },
    department,
};

function createAppointmentRepositoryMock(): jest.Mocked<AppointmentRepository> {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        findPatientById: jest.fn(),
        findServiceById: jest.fn(),
        findStaffById: jest.fn(),
        countConflictingAppointments: jest.fn(),
        list: jest.fn(),
        listToday: jest.fn(),
        reschedule: jest.fn(),
        updateStatus: jest.fn(),
    };
}

function createLockRepositoryMock(): jest.Mocked<AppointmentSlotLockRepository> {
    return {
        acquireSlotLock: jest.fn(),
        releaseSlotLock: jest.fn(),
        findLockedSlots: jest.fn(),
    };
}

function createService() {
    const repository = createAppointmentRepositoryMock();
    const lockRepository = createLockRepositoryMock();
    const scheduleService = {
        getAvailableSlots: jest.fn(),
    } as unknown as jest.Mocked<ScheduleService>;
    const eventPublisher: jest.Mocked<AppointmentEventPublisher> = {
        publish: jest.fn(),
    };
    const auditLogger: jest.Mocked<AppointmentAuditLogger> = {
        recordReschedule: jest.fn(),
    };
    const service = new AppointmentService(
        repository,
        scheduleService,
        lockRepository,
        eventPublisher,
        auditLogger,
        () => new Date('2026-05-19T08:00:00.000Z'),
    );

    repository.findPatientById.mockResolvedValue(patient);
    repository.findServiceById.mockResolvedValue(serviceCatalog);
    repository.findStaffById.mockResolvedValue(staff);
    repository.countConflictingAppointments.mockResolvedValue(0);
    repository.create.mockResolvedValue(appointment);
    repository.findById.mockResolvedValue(appointment);
    repository.updateStatus.mockResolvedValue({
        ...appointment,
        status: AppointmentStatus.CONFIRMED,
    });
    repository.reschedule.mockResolvedValue({
        ...appointment,
        scheduledAt: new Date('2026-05-20T10:00:00.000Z'),
        endAt: new Date('2026-05-20T10:30:00.000Z'),
    });
    lockRepository.acquireSlotLock.mockResolvedValue(true);
    lockRepository.releaseSlotLock.mockResolvedValue(undefined);
    scheduleService.getAvailableSlots.mockResolvedValue({
        staffProfileId,
        serviceId,
        date: '2026-05-20',
        slots: [
            {
                start: scheduledAt.toISOString(),
                end: endAt.toISOString(),
                startTime: '09:00',
                endTime: '09:30',
                durationMinutes: 30,
            },
            {
                start: '2026-05-20T10:00:00.000Z',
                end: '2026-05-20T10:30:00.000Z',
                startTime: '10:00',
                endTime: '10:30',
                durationMinutes: 30,
            },
        ],
    });

    return {
        service,
        repository,
        lockRepository,
        scheduleService,
        eventPublisher,
        auditLogger,
    };
}

describe('AppointmentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('books an available appointment with a slot lock', async () => {
        const { service, repository, lockRepository, eventPublisher } = createService();

        const result = await service.bookAppointment({
            patientId,
            serviceCatalogId: serviceId,
            staffProfileId,
            scheduledAt,
            notes: ' First visit ',
        });

        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                departmentId,
                serviceCatalogId: serviceId,
                staffProfileId,
                durationMinutes: 30,
                basePrice: 50,
                notes: 'First visit',
            }),
        );
        expect(lockRepository.acquireSlotLock).toHaveBeenCalledWith(
            expect.objectContaining({
                staffProfileId,
                serviceId,
                scheduledAt,
                endAt,
                ttlSeconds: 300,
            }),
        );
        expect(lockRepository.releaseSlotLock).toHaveBeenCalledWith(
            expect.objectContaining({
                staffProfileId,
                scheduledAt,
            }),
        );
        expect(eventPublisher.publish).toHaveBeenCalledWith('AppointmentBooked', {
            appointment,
            actorUserId: undefined,
        });
        expect(result.id).toBe(appointmentId);
    });

    it('rejects a slot that is already Redis-locked', async () => {
        const { service, repository, lockRepository } = createService();
        lockRepository.acquireSlotLock.mockResolvedValue(false);

        await expect(
            service.bookAppointment({
                patientId,
                serviceCatalogId: serviceId,
                staffProfileId,
                scheduledAt,
            }),
        ).rejects.toMatchObject({
            message: 'Appointment slot is currently locked',
            statusCode: 409,
        });

        expect(repository.create).not.toHaveBeenCalled();
    });

    it('releases the slot lock when a conflict is detected after locking', async () => {
        const { service, repository, lockRepository } = createService();
        repository.countConflictingAppointments.mockResolvedValue(1);

        await expect(
            service.bookAppointment({
                patientId,
                serviceCatalogId: serviceId,
                staffProfileId,
                scheduledAt,
            }),
        ).rejects.toMatchObject({
            message: 'Appointment slot is already booked',
            statusCode: 409,
        });

        expect(repository.create).not.toHaveBeenCalled();
        expect(lockRepository.releaseSlotLock).toHaveBeenCalled();
    });

    it('rejects invalid status transitions', async () => {
        const { service } = createService();

        await expect(
            service.updateAppointmentStatus(appointmentId, {
                status: AppointmentStatus.COMPLETED,
            }),
        ).rejects.toMatchObject({
            message: 'Cannot transition appointment from SCHEDULED to COMPLETED',
            statusCode: 422,
        });
    });

    it('requires a cancellation reason', async () => {
        const { service } = createService();

        await expect(
            service.updateAppointmentStatus(appointmentId, {
                status: AppointmentStatus.CANCELLED,
            }),
        ).rejects.toMatchObject({
            message: 'Cancellation reason is required',
            statusCode: 400,
        });
    });

    it('reschedules and records old and new appointment times', async () => {
        const { service, repository, auditLogger } = createService();
        const newStart = new Date('2026-05-20T10:00:00.000Z');

        await service.rescheduleAppointment(appointmentId, {
            scheduledAt: newStart,
            actorUserId: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
        });

        expect(repository.reschedule).toHaveBeenCalledWith(
            appointmentId,
            expect.objectContaining({
                scheduledAt: newStart,
                endAt: new Date('2026-05-20T10:30:00.000Z'),
            }),
        );
        expect(auditLogger.recordReschedule).toHaveBeenCalledWith({
            appointmentId,
            actorUserId: '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee',
            oldScheduledAt: scheduledAt,
            oldEndAt: endAt,
            newScheduledAt: new Date('2026-05-20T10:00:00.000Z'),
            newEndAt: new Date('2026-05-20T10:30:00.000Z'),
        });
    });
});
