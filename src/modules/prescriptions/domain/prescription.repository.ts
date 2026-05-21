import {
    PrescriptionListResult,
    PrescriptionMedicalRecordLink,
    PrescriptionPatientSummary,
    PrescriptionView,
} from './prescription.entity';

export interface CreatePrescriptionItemData {
    medicationName: string;
    dosage: string;
    frequency: string;
    durationInstructions?: string | null;
    quantityPrescribed: number;
    notes?: string | null;
}

export interface CreatePrescriptionData {
    patientId: string;
    medicalRecordId: string;
    appointmentId?: string | null;
    staffProfileId: string;
    expiresAt?: Date | null;
    notes?: string | null;
    items: CreatePrescriptionItemData[];
    actorUserId?: string;
}

export interface ListPrescriptionsFilters {
    page: number;
    limit: number;
    patientId?: string;
    isVoided?: boolean;
}

export interface VoidPrescriptionData {
    reason: string;
    voidedAt: Date;
    actorUserId: string;
}

export interface PrescriptionRepository {
    createWithPharmacyQueue(data: CreatePrescriptionData): Promise<PrescriptionView>;
    findById(id: string): Promise<PrescriptionView | null>;
    findMedicalRecordById(id: string): Promise<PrescriptionMedicalRecordLink | null>;
    findPatientById(id: string): Promise<PrescriptionPatientSummary | null>;
    findPatientByUserId(userId: string): Promise<PrescriptionPatientSummary | null>;
    list(filters: ListPrescriptionsFilters): Promise<PrescriptionListResult>;
    hasDispensingActivity(id: string): Promise<boolean>;
    voidPrescription(id: string, data: VoidPrescriptionData): Promise<PrescriptionView>;
}
