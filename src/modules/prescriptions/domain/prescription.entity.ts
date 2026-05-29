import {
    AppointmentStatus,
    PharmacyStatus,
} from '../../../generated/prisma';

export type PrescriptionLifecycleStatus = 'ACTIVE' | 'VOIDED';

export interface PrescriptionPatientSummary {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    allergies: unknown;
    name: string;
}

export interface PrescriptionStaffSummary {
    id: string;
    userId: string;
    employeeCode: string;
    specialization: string | null;
    displayName: string;
}

export interface PrescriptionMedicalRecordSummary {
    id: string;
    diagnosis: string | null;
    isFinalized: boolean;
    createdAt: Date;
}

export interface PrescriptionAppointmentSummary {
    id: string;
    status: AppointmentStatus;
    scheduledAt: Date;
    endAt: Date;
}

export interface PrescriptionItemView {
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    durationInstructions: string | null;
    quantityPrescribed: number;
    quantityDispensed: number | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PrescriptionPharmacyQueueSummary {
    id: string;
    status: PharmacyStatus;
    requestedAt: Date;
    processedAt: Date | null;
    notes: string | null;
    dispensingItems: Array<{
        id: string;
        prescriptionItemId: string;
        inventoryItemId: string | null;
        quantityToDispense: number;
        quantityDispensed: number | null;
        status: PharmacyStatus;
        notes: string | null;
    }>;
}

export interface PrescriptionView {
    id: string;
    patientId: string;
    medicalRecordId: string | null;
    appointmentId: string | null;
    staffProfileId: string;
    issuedAt: Date;
    expiresAt: Date | null;
    notes: string | null;
    isVoided: boolean;
    voidedAt: Date | null;
    voidReason: string | null;
    voidedByUserId: string | null;
    status: PrescriptionLifecycleStatus;
    pharmacyStatus: PharmacyStatus | null;
    createdAt: Date;
    updatedAt: Date;
    patient: PrescriptionPatientSummary;
    medicalRecord: PrescriptionMedicalRecordSummary | null;
    appointment: PrescriptionAppointmentSummary | null;
    staff: PrescriptionStaffSummary;
    items: PrescriptionItemView[];
    pharmacyQueue: PrescriptionPharmacyQueueSummary[];
}

export interface PrescriptionListResult {
    items: PrescriptionView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface PrescriptionMedicalRecordLink {
    id: string;
    patientId: string;
    appointmentId: string | null;
    staffProfileId: string;
    diagnosis: string | null;
    isFinalized: boolean;
    createdAt: Date;
}
