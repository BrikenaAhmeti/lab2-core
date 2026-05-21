import { AppError } from '../../../shared/core/errors/app-error';
import {
    normalizeOptionalText,
    normalizeRequiredText,
} from '../domain/prescription.normalizer';
import { PrescriptionEventPublisher } from '../domain/prescription-event.publisher';
import {
    CreatePrescriptionItemData,
    PrescriptionRepository,
} from '../domain/prescription.repository';

export class PrescriptionService {
    constructor(
        private readonly prescriptionRepository: PrescriptionRepository,
        private readonly eventPublisher: PrescriptionEventPublisher,
        private readonly nowProvider: () => Date = () => new Date(),
    ) {}

    async createPrescription(data: {
        medicalRecordId: string;
        expiresAt?: Date | null;
        notes?: string | null;
        items: CreatePrescriptionItemData[];
        actorUserId?: string;
    }) {
        if (!data.items.length) {
            throw new AppError('At least one prescription item is required', 400);
        }

        const medicalRecord = await this.prescriptionRepository.findMedicalRecordById(
            data.medicalRecordId,
        );

        if (!medicalRecord) {
            throw new AppError('Medical record not found', 404);
        }

        const prescription = await this.prescriptionRepository.createWithPharmacyQueue({
            patientId: medicalRecord.patientId,
            medicalRecordId: medicalRecord.id,
            appointmentId: medicalRecord.appointmentId,
            staffProfileId: medicalRecord.staffProfileId,
            expiresAt: data.expiresAt ?? null,
            notes: normalizeOptionalText(data.notes),
            items: data.items.map((item) => ({
                medicationName: normalizeRequiredText(
                    item.medicationName,
                    'Medication name',
                ),
                dosage: normalizeRequiredText(item.dosage, 'Dosage'),
                frequency: normalizeRequiredText(item.frequency, 'Frequency'),
                durationInstructions: normalizeOptionalText(
                    item.durationInstructions,
                ),
                quantityPrescribed: item.quantityPrescribed,
                notes: normalizeOptionalText(item.notes),
            })),
            actorUserId: data.actorUserId,
        });

        await this.publishSafely('PrescriptionCreated', {
            prescription,
            actorUserId: data.actorUserId,
        });

        return prescription;
    }

    async listPrescriptions(
        filters: {
            page: number;
            limit: number;
            patientId?: string;
            isVoided?: boolean;
        },
        actorUserId?: string,
        canReadAll = false,
    ) {
        const patientId = await this.resolveReadablePatientId(
            filters.patientId,
            actorUserId,
            canReadAll,
        );

        return this.prescriptionRepository.list({
            ...filters,
            patientId,
        });
    }

    async getPrescriptionById(
        id: string,
        actorUserId?: string,
        canReadAll = false,
    ) {
        const prescription = await this.getExistingPrescription(id);
        this.ensureCanRead(prescription.patient.userId, actorUserId, canReadAll);

        return prescription;
    }

    async voidPrescription(
        id: string,
        data: {
            reason: string;
            actorUserId?: string;
        },
    ) {
        if (!data.actorUserId) {
            throw new AppError('Actor user is required', 400);
        }

        const prescription = await this.getExistingPrescription(id);

        if (prescription.isVoided) {
            return prescription;
        }

        const hasDispensingActivity =
            await this.prescriptionRepository.hasDispensingActivity(id);

        if (hasDispensingActivity) {
            throw new AppError('Dispensed prescriptions cannot be voided', 409);
        }

        return this.prescriptionRepository.voidPrescription(id, {
            reason: normalizeRequiredText(data.reason, 'Void reason'),
            voidedAt: this.nowProvider(),
            actorUserId: data.actorUserId,
        });
    }

    private async getExistingPrescription(id: string) {
        const prescription = await this.prescriptionRepository.findById(id);

        if (!prescription) {
            throw new AppError('Prescription not found', 404);
        }

        return prescription;
    }

    private async resolveReadablePatientId(
        patientId: string | undefined,
        actorUserId: string | undefined,
        canReadAll: boolean,
    ) {
        if (canReadAll) {
            return patientId;
        }

        if (!actorUserId) {
            throw new AppError('Forbidden', 403);
        }

        if (patientId) {
            const patient = await this.prescriptionRepository.findPatientById(patientId);

            if (!patient) {
                throw new AppError('Patient not found', 404);
            }

            if (patient.userId !== actorUserId) {
                throw new AppError('Forbidden', 403);
            }

            return patientId;
        }

        const patient = await this.prescriptionRepository.findPatientByUserId(
            actorUserId,
        );

        return patient?.id ?? 'no-readable-patient';
    }

    private ensureCanRead(
        patientUserId: string | null,
        actorUserId: string | undefined,
        canReadAll: boolean,
    ) {
        if (canReadAll) {
            return;
        }

        if (patientUserId && patientUserId === actorUserId) {
            return;
        }

        throw new AppError('Forbidden', 403);
    }

    private async publishSafely(
        type: Parameters<PrescriptionEventPublisher['publish']>[0],
        payload: Parameters<PrescriptionEventPublisher['publish']>[1],
    ) {
        try {
            await this.eventPublisher.publish(type, payload);
        } catch {
            // Notification delivery should not fail prescription creation.
        }
    }
}
