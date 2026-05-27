import {
    MedicalRecordAmendmentView,
    MedicalRecordAppointmentLink,
    MedicalRecordListResult,
    MedicalRecordPatientSummary,
    MedicalRecordView,
} from './medical-record.entity';

export interface MedicalRecordPatchData {
    chiefComplaint?: string | null;
    vitals?: unknown;
    diagnosis?: string | null;
    treatmentPlan?: string | null;
    notes?: string | null;
    followUpInstructions?: string | null;
}

export interface CreateMedicalRecordData extends MedicalRecordPatchData {
    patientId: string;
    appointmentId: string;
    staffProfileId: string;
    departmentId: string;
    actorUserId?: string;
}

export interface UpdateMedicalRecordData extends MedicalRecordPatchData {
    actorUserId?: string;
}

export interface AddMedicalRecordAmendmentData {
    medicalRecordId: string;
    amendedByUserId: string;
    reason: string;
    previousSnapshot: unknown;
    actorUserId?: string;
}

export interface ListMedicalRecordsFilters {
    page: number;
    limit: number;
    patientId?: string;
    isFinalized?: boolean;
}

export interface MedicalRecordRepository {
    create(data: CreateMedicalRecordData): Promise<MedicalRecordView>;
    findById(id: string): Promise<MedicalRecordView | null>;
    findPatientById(id: string): Promise<MedicalRecordPatientSummary | null>;
    findPatientByUserId(userId: string): Promise<MedicalRecordPatientSummary | null>;
    findAppointmentById(id: string): Promise<MedicalRecordAppointmentLink | null>;
    list(filters: ListMedicalRecordsFilters): Promise<MedicalRecordListResult>;
    updateDraft(id: string, data: UpdateMedicalRecordData): Promise<MedicalRecordView>;
    finalize(id: string, actorUserId?: string): Promise<MedicalRecordView>;
    createAmendment(
        data: AddMedicalRecordAmendmentData,
    ): Promise<MedicalRecordAmendmentView>;
}
