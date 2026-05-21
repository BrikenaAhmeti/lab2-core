import {
    AppointmentStatus,
    LabOrderStatus,
    LabResultStatus,
} from '../../src/generated/prisma';
import { MedicalRecordView } from '../../src/modules/medical-records/domain/medical-record.entity';
import { MedicalRecordRepository } from '../../src/modules/medical-records/domain/medical-record.repository';
import { MedicalRecordService } from '../../src/modules/medical-records/services/medical-record.service';

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const medicalRecordId = '2fb8b77f-0a57-4c85-89f7-9222da1fcb12';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';

const appointment = {
    id: appointmentId,
    patientId,
    staffProfileId,
    departmentId,
    status: AppointmentStatus.IN_PROGRESS,
    scheduledAt: new Date('2030-01-02T09:00:00.000Z'),
    endAt: new Date('2030-01-02T09:30:00.000Z'),
};

const record: MedicalRecordView = {
    id: medicalRecordId,
    patientId,
    appointmentId,
    staffProfileId,
    departmentId,
    chiefComplaint: 'Chest discomfort',
    vitals: { bloodPressure: '120/80' },
    diagnosis: 'Stable angina',
    treatmentPlan: 'Continue monitoring',
    notes: null,
    followUpInstructions: 'Follow up in two weeks',
    isFinalized: false,
    createdAt: new Date('2026-05-21T08:00:00.000Z'),
    updatedAt: new Date('2026-05-21T08:00:00.000Z'),
    patient: {
        id: patientId,
        userId: patientUserId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@medsphere.local',
        phone: '+38344111222',
        name: 'Ada Lovelace',
    },
    appointment: {
        id: appointmentId,
        status: AppointmentStatus.IN_PROGRESS,
        scheduledAt: appointment.scheduledAt,
        endAt: appointment.endAt,
    },
    staff: {
        id: staffProfileId,
        userId: actorUserId,
        employeeCode: 'DR-001',
        specialization: 'Cardiologist',
        displayName: 'DR-001 - Cardiologist',
    },
    department: {
        id: departmentId,
        name: 'Cardiology',
        isActive: true,
    },
    amendments: [],
    prescriptions: [],
    labOrders: [
        {
            id: '0f79fa2f-2db3-4819-9c81-f0e51daeed51',
            status: LabOrderStatus.PENDING,
            priority: 'normal',
            notes: null,
            orderedAt: new Date('2026-05-21T08:10:00.000Z'),
            completedAt: null,
            reviewedAt: null,
            items: [
                {
                    id: '22c52439-b31f-4de8-9b0e-80dd54e47561',
                    resultValue: null,
                    resultUnit: null,
                    resultNotes: null,
                    resultStatus: LabResultStatus.PENDING,
                    isCritical: false,
                    completedAt: null,
                    labTest: {
                        id: 'c16d8e7d-df2c-430a-a735-9b69dbed0747',
                        code: 'CBC',
                        name: 'Complete Blood Count',
                    },
                },
            ],
        },
    ],
};

function createRepositoryMock(): jest.Mocked<MedicalRecordRepository> {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        findPatientById: jest.fn(),
        findPatientByUserId: jest.fn(),
        findAppointmentById: jest.fn(),
        list: jest.fn(),
        updateDraft: jest.fn(),
        finalize: jest.fn(),
        createAmendment: jest.fn(),
    };
}

describe('MedicalRecordService', () => {
    it('creates a medical record from a matching appointment', async () => {
        const repository = createRepositoryMock();
        repository.findAppointmentById.mockResolvedValue(appointment);
        repository.create.mockResolvedValue(record);
        const service = new MedicalRecordService(repository);

        const result = await service.createMedicalRecord({
            patientId,
            appointmentId,
            staffProfileId,
            chiefComplaint: ' Chest discomfort ',
            diagnosis: ' Stable angina ',
            actorUserId,
        });

        expect(result.id).toBe(medicalRecordId);
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                appointmentId,
                staffProfileId,
                departmentId,
                chiefComplaint: 'Chest discomfort',
                diagnosis: 'Stable angina',
            }),
        );
    });

    it('rejects a medical record when the appointment belongs to another patient', async () => {
        const repository = createRepositoryMock();
        repository.findAppointmentById.mockResolvedValue({
            ...appointment,
            patientId: 'c17fe858-dce7-4d46-97cc-b9d5afc928bc',
        });
        const service = new MedicalRecordService(repository);

        await expect(
            service.createMedicalRecord({
                patientId,
                appointmentId,
                staffProfileId,
            }),
        ).rejects.toMatchObject({
            message: 'Appointment does not belong to this patient',
            statusCode: 400,
        });
    });

    it('updates draft records only', async () => {
        const repository = createRepositoryMock();
        repository.findById.mockResolvedValue(record);
        repository.updateDraft.mockResolvedValue({
            ...record,
            treatmentPlan: 'Hydration and follow-up',
        });
        const service = new MedicalRecordService(repository);

        const result = await service.updateMedicalRecord(medicalRecordId, {
            treatmentPlan: ' Hydration and follow-up ',
            actorUserId,
        });

        expect(result.treatmentPlan).toBe('Hydration and follow-up');
        expect(repository.updateDraft).toHaveBeenCalledWith(
            medicalRecordId,
            expect.objectContaining({
                treatmentPlan: 'Hydration and follow-up',
                actorUserId,
            }),
        );
    });

    it('blocks direct updates after finalization', async () => {
        const repository = createRepositoryMock();
        repository.findById.mockResolvedValue({
            ...record,
            isFinalized: true,
        });
        const service = new MedicalRecordService(repository);

        await expect(
            service.updateMedicalRecord(medicalRecordId, {
                notes: 'Updated note',
                actorUserId,
            }),
        ).rejects.toMatchObject({
            message: 'Finalized medical records cannot be updated',
            statusCode: 409,
        });
    });

    it('finalizes a draft record', async () => {
        const repository = createRepositoryMock();
        repository.findById.mockResolvedValue(record);
        repository.finalize.mockResolvedValue({
            ...record,
            isFinalized: true,
        });
        const service = new MedicalRecordService(repository);

        const result = await service.finalizeMedicalRecord(medicalRecordId, actorUserId);

        expect(result.isFinalized).toBe(true);
        expect(repository.finalize).toHaveBeenCalledWith(medicalRecordId, actorUserId);
    });

    it('adds an amendment to a finalized record without rewriting the record', async () => {
        const repository = createRepositoryMock();
        repository.findById.mockResolvedValue({
            ...record,
            isFinalized: true,
        });
        repository.createAmendment.mockResolvedValue({
            id: '921484e4-c080-4a04-821b-fc2902180cce',
            medicalRecordId,
            amendedByUserId: actorUserId,
            reason: 'Correct diagnosis wording',
            previousSnapshot: {},
            createdAt: new Date('2026-05-21T09:00:00.000Z'),
            updatedAt: new Date('2026-05-21T09:00:00.000Z'),
        });
        const service = new MedicalRecordService(repository);

        const result = await service.addAmendment(medicalRecordId, {
            reason: ' Correct diagnosis wording ',
            changes: {
                diagnosis: 'Stable exertional angina',
            },
            actorUserId,
        });

        expect(result.medicalRecordId).toBe(medicalRecordId);
        expect(repository.createAmendment).toHaveBeenCalledWith(
            expect.objectContaining({
                medicalRecordId,
                amendedByUserId: actorUserId,
                reason: 'Correct diagnosis wording',
                previousSnapshot: expect.objectContaining({
                    original: expect.objectContaining({
                        id: medicalRecordId,
                        diagnosis: record.diagnosis,
                    }),
                    changes: {
                        diagnosis: 'Stable exertional angina',
                    },
                }),
            }),
        );
        expect(repository.updateDraft).not.toHaveBeenCalled();
    });
});
