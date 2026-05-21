import {
    AppointmentStatus,
    PharmacyStatus,
} from '../../src/generated/prisma';
import { PrescriptionView } from '../../src/modules/prescriptions/domain/prescription.entity';
import { PrescriptionEventPublisher } from '../../src/modules/prescriptions/domain/prescription-event.publisher';
import { PrescriptionRepository } from '../../src/modules/prescriptions/domain/prescription.repository';
import { PrescriptionService } from '../../src/modules/prescriptions/services/prescription.service';

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const medicalRecordId = '2fb8b77f-0a57-4c85-89f7-9222da1fcb12';
const prescriptionId = '664e433c-7166-45f0-8d2d-5f03b7bbdb3c';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';

const medicalRecord = {
    id: medicalRecordId,
    patientId,
    appointmentId,
    staffProfileId,
    diagnosis: 'Stable angina',
    isFinalized: false,
    createdAt: new Date('2026-05-21T08:00:00.000Z'),
};

const prescription: PrescriptionView = {
    id: prescriptionId,
    patientId,
    medicalRecordId,
    appointmentId,
    staffProfileId,
    issuedAt: new Date('2026-05-21T08:30:00.000Z'),
    expiresAt: new Date('2026-06-21T08:30:00.000Z'),
    notes: 'Take after meals',
    isVoided: false,
    voidedAt: null,
    voidReason: null,
    voidedByUserId: null,
    status: 'ACTIVE',
    pharmacyStatus: PharmacyStatus.PENDING,
    createdAt: new Date('2026-05-21T08:30:00.000Z'),
    updatedAt: new Date('2026-05-21T08:30:00.000Z'),
    patient: {
        id: patientId,
        userId: patientUserId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@medsphere.local',
        phone: '+38344111222',
        allergies: ['penicillin'],
        name: 'Ada Lovelace',
    },
    medicalRecord: {
        id: medicalRecordId,
        diagnosis: 'Stable angina',
        isFinalized: false,
        createdAt: medicalRecord.createdAt,
    },
    appointment: {
        id: appointmentId,
        status: AppointmentStatus.IN_PROGRESS,
        scheduledAt: new Date('2030-01-02T09:00:00.000Z'),
        endAt: new Date('2030-01-02T09:30:00.000Z'),
    },
    staff: {
        id: staffProfileId,
        userId: actorUserId,
        employeeCode: 'DR-001',
        specialization: 'Cardiologist',
        displayName: 'DR-001 - Cardiologist',
    },
    items: [
        {
            id: '4149ce17-a874-4545-a51d-3f046c19af6f',
            medicationName: 'Aspirin',
            dosage: '81 mg',
            frequency: 'Once daily',
            durationInstructions: '30 days',
            quantityPrescribed: 30,
            quantityDispensed: null,
            notes: null,
            createdAt: new Date('2026-05-21T08:30:00.000Z'),
            updatedAt: new Date('2026-05-21T08:30:00.000Z'),
        },
    ],
    pharmacyQueue: [
        {
            id: 'f8b1b3b1-7186-492f-87bb-1d194da8e0fe',
            status: PharmacyStatus.PENDING,
            requestedAt: new Date('2026-05-21T08:30:00.000Z'),
            processedAt: null,
            notes: null,
            dispensingItems: [],
        },
    ],
};

function createRepositoryMock(): jest.Mocked<PrescriptionRepository> {
    return {
        createWithPharmacyQueue: jest.fn(),
        findById: jest.fn(),
        findMedicalRecordById: jest.fn(),
        findPatientById: jest.fn(),
        findPatientByUserId: jest.fn(),
        list: jest.fn(),
        hasDispensingActivity: jest.fn(),
        voidPrescription: jest.fn(),
    };
}

function createEventPublisherMock(): jest.Mocked<PrescriptionEventPublisher> {
    return {
        publish: jest.fn(),
    };
}

describe('PrescriptionService', () => {
    it('creates a prescription from a medical record and queues it for pharmacy', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        repository.findMedicalRecordById.mockResolvedValue(medicalRecord);
        repository.createWithPharmacyQueue.mockResolvedValue(prescription);
        const service = new PrescriptionService(repository, eventPublisher);

        const result = await service.createPrescription({
            medicalRecordId,
            expiresAt: prescription.expiresAt,
            notes: ' Take   after meals ',
            items: [
                {
                    medicationName: ' Aspirin ',
                    dosage: ' 81 mg ',
                    frequency: ' Once   daily ',
                    durationInstructions: ' 30 days ',
                    quantityPrescribed: 30,
                },
            ],
            actorUserId,
        });

        expect(result.id).toBe(prescriptionId);
        expect(repository.createWithPharmacyQueue).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                medicalRecordId,
                appointmentId,
                staffProfileId,
                notes: 'Take after meals',
                items: [
                    expect.objectContaining({
                        medicationName: 'Aspirin',
                        dosage: '81 mg',
                        frequency: 'Once daily',
                        durationInstructions: '30 days',
                    }),
                ],
            }),
        );
        expect(eventPublisher.publish).toHaveBeenCalledWith(
            'PrescriptionCreated',
            expect.objectContaining({ prescription, actorUserId }),
        );
    });

    it('scopes patient list reads to the authenticated patient', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        repository.findPatientById.mockResolvedValue(prescription.patient);
        repository.list.mockResolvedValue({
            items: [prescription],
            meta: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });
        const service = new PrescriptionService(repository, eventPublisher);

        await service.listPrescriptions(
            {
                page: 1,
                limit: 10,
                patientId,
                isVoided: false,
            },
            patientUserId,
            false,
        );

        expect(repository.list).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                isVoided: false,
            }),
        );
    });

    it('blocks voiding after dispensing has started', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        repository.findById.mockResolvedValue(prescription);
        repository.hasDispensingActivity.mockResolvedValue(true);
        const service = new PrescriptionService(repository, eventPublisher);

        await expect(
            service.voidPrescription(prescriptionId, {
                reason: 'Medication changed',
                actorUserId,
            }),
        ).rejects.toMatchObject({
            message: 'Dispensed prescriptions cannot be voided',
            statusCode: 409,
        });
        expect(repository.voidPrescription).not.toHaveBeenCalled();
    });

    it('voids an undispensed prescription with an audit reason', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        const voidedAt = new Date('2026-05-21T09:00:00.000Z');
        repository.findById.mockResolvedValue(prescription);
        repository.hasDispensingActivity.mockResolvedValue(false);
        repository.voidPrescription.mockResolvedValue({
            ...prescription,
            isVoided: true,
            status: 'VOIDED',
            voidedAt,
            voidReason: 'Medication changed',
            voidedByUserId: actorUserId,
            pharmacyStatus: PharmacyStatus.CANCELLED,
        });
        const service = new PrescriptionService(
            repository,
            eventPublisher,
            () => voidedAt,
        );

        const result = await service.voidPrescription(prescriptionId, {
            reason: ' Medication   changed ',
            actorUserId,
        });

        expect(result.isVoided).toBe(true);
        expect(repository.voidPrescription).toHaveBeenCalledWith(prescriptionId, {
            reason: 'Medication changed',
            voidedAt,
            actorUserId,
        });
    });
});
