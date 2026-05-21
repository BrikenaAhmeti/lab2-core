import {
    AppointmentStatus,
    LabOrderStatus,
    LabResultStatus,
} from '../../../generated/prisma';

export interface MedicalRecordPatientSummary {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    name: string;
}

export interface MedicalRecordStaffSummary {
    id: string;
    userId: string;
    employeeCode: string;
    specialization: string | null;
    displayName: string;
}

export interface MedicalRecordDepartmentSummary {
    id: string;
    name: string;
    isActive: boolean;
}

export interface MedicalRecordAppointmentSummary {
    id: string;
    status: AppointmentStatus;
    scheduledAt: Date;
    endAt: Date;
}

export interface MedicalRecordAmendmentView {
    id: string;
    medicalRecordId: string;
    amendedByUserId: string;
    reason: string;
    previousSnapshot: unknown;
    createdAt: Date;
    updatedAt: Date;
}

export interface MedicalRecordPrescriptionSummary {
    id: string;
    issuedAt: Date;
    expiresAt: Date | null;
    notes: string | null;
    items: Array<{
        id: string;
        medicationName: string;
        dosage: string;
        frequency: string;
        durationInstructions: string | null;
        quantityPrescribed: number;
        quantityDispensed: number | null;
        notes: string | null;
    }>;
}

export interface MedicalRecordLabOrderSummary {
    id: string;
    status: LabOrderStatus;
    priority: string | null;
    notes: string | null;
    orderedAt: Date;
    completedAt: Date | null;
    reviewedAt: Date | null;
    items: Array<{
        id: string;
        resultValue: string | null;
        resultUnit: string | null;
        resultNotes: string | null;
        resultStatus: LabResultStatus;
        isCritical: boolean;
        completedAt: Date | null;
        labTest: {
            id: string;
            code: string;
            name: string;
        };
    }>;
}

export interface MedicalRecordView {
    id: string;
    patientId: string;
    appointmentId: string | null;
    staffProfileId: string;
    departmentId: string;
    chiefComplaint: string | null;
    vitals: unknown;
    diagnosis: string | null;
    treatmentPlan: string | null;
    notes: string | null;
    followUpInstructions: string | null;
    isFinalized: boolean;
    createdAt: Date;
    updatedAt: Date;
    patient: MedicalRecordPatientSummary;
    appointment: MedicalRecordAppointmentSummary | null;
    staff: MedicalRecordStaffSummary;
    department: MedicalRecordDepartmentSummary;
    amendments: MedicalRecordAmendmentView[];
    prescriptions: MedicalRecordPrescriptionSummary[];
    labOrders: MedicalRecordLabOrderSummary[];
}

export interface MedicalRecordListResult {
    items: MedicalRecordView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface MedicalRecordAppointmentLink {
    id: string;
    patientId: string;
    staffProfileId: string | null;
    departmentId: string;
    status: AppointmentStatus;
    scheduledAt: Date;
    endAt: Date;
}
