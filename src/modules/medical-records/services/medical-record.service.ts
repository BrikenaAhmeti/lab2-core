import { AppError } from '../../../shared/core/errors/app-error';
import {
    normalizeOptionalText,
    normalizeRequiredText,
} from '../domain/medical-record.normalizer';
import {
    MedicalRecordPatchData,
    MedicalRecordRepository,
} from '../domain/medical-record.repository';
import { MedicalRecordView } from '../domain/medical-record.entity';

type NormalizedPatch = MedicalRecordPatchData;

const PATCH_FIELDS: Array<keyof MedicalRecordPatchData> = [
    'chiefComplaint',
    'vitals',
    'diagnosis',
    'treatmentPlan',
    'notes',
    'followUpInstructions',
];

export class MedicalRecordService {
    constructor(private readonly medicalRecordRepository: MedicalRecordRepository) {}

    async createMedicalRecord(data: {
        patientId: string;
        appointmentId: string;
        staffProfileId: string;
        chiefComplaint?: string | null;
        vitals?: unknown;
        diagnosis?: string | null;
        treatmentPlan?: string | null;
        notes?: string | null;
        followUpInstructions?: string | null;
        actorUserId?: string;
    }) {
        const appointment = await this.medicalRecordRepository.findAppointmentById(
            data.appointmentId,
        );

        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }

        if (appointment.patientId !== data.patientId) {
            throw new AppError('Appointment does not belong to this patient', 400);
        }

        if (!appointment.staffProfileId) {
            throw new AppError('Appointment must have an assigned staff profile', 400);
        }

        if (appointment.staffProfileId !== data.staffProfileId) {
            throw new AppError('Appointment is assigned to a different staff profile', 400);
        }

        return this.medicalRecordRepository.create({
            patientId: data.patientId,
            appointmentId: data.appointmentId,
            staffProfileId: data.staffProfileId,
            departmentId: appointment.departmentId,
            ...this.normalizePatch(data),
            actorUserId: data.actorUserId,
        });
    }

    async listMedicalRecords(
        filters: {
            page: number;
            limit: number;
            patientId?: string;
            isFinalized?: boolean;
        },
        actorUserId?: string,
        canReadAll = false,
    ) {
        const patientId = await this.resolveReadablePatientId(
            filters.patientId,
            actorUserId,
            canReadAll,
        );

        return this.medicalRecordRepository.list({
            ...filters,
            patientId,
            isFinalized: canReadAll ? filters.isFinalized : true,
        });
    }

    async getMedicalRecordById(
        id: string,
        actorUserId?: string,
        canReadAll = false,
    ) {
        const record = await this.getExistingRecord(id);
        this.ensureCanRead(record, actorUserId, canReadAll);

        return record;
    }

    async updateMedicalRecord(
        id: string,
        data: MedicalRecordPatchData & { actorUserId?: string },
    ) {
        const record = await this.getExistingRecord(id);

        if (record.isFinalized) {
            throw new AppError('Finalized medical records cannot be updated', 409);
        }

        const updateData = this.normalizePatch(data, true);

        return this.medicalRecordRepository.updateDraft(id, {
            ...updateData,
            actorUserId: data.actorUserId,
        });
    }

    async finalizeMedicalRecord(id: string, actorUserId?: string) {
        const record = await this.getExistingRecord(id);

        if (record.isFinalized) {
            return record;
        }

        return this.medicalRecordRepository.finalize(id, actorUserId);
    }

    async addAmendment(
        id: string,
        data: {
            reason: string;
            changes: MedicalRecordPatchData;
            actorUserId?: string;
        },
    ) {
        if (!data.actorUserId) {
            throw new AppError('Actor user is required', 400);
        }

        const record = await this.getExistingRecord(id);

        if (!record.isFinalized) {
            throw new AppError('Only finalized medical records can be amended', 409);
        }

        const changes = this.normalizePatch(data.changes, true);
        const reason = this.normalizeReason(data.reason);

        return this.medicalRecordRepository.createAmendment({
            medicalRecordId: id,
            amendedByUserId: data.actorUserId,
            reason,
            previousSnapshot: {
                original: this.snapshotRecord(record),
                changes,
            },
            actorUserId: data.actorUserId,
        });
    }

    private async getExistingRecord(id: string) {
        const record = await this.medicalRecordRepository.findById(id);

        if (!record) {
            throw new AppError('Medical record not found', 404);
        }

        return record;
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
            const patient = await this.medicalRecordRepository.findPatientById(patientId);

            if (!patient) {
                throw new AppError('Patient not found', 404);
            }

            if (patient.userId !== actorUserId) {
                throw new AppError('Forbidden', 403);
            }

            return patientId;
        }

        const patient = await this.medicalRecordRepository.findPatientByUserId(
            actorUserId,
        );

        return patient?.id ?? 'no-readable-patient';
    }

    private ensureCanRead(
        record: MedicalRecordView,
        actorUserId: string | undefined,
        canReadAll: boolean,
    ) {
        if (canReadAll) {
            return;
        }

        if (record.patient.userId && record.patient.userId === actorUserId) {
            if (!record.isFinalized) {
                throw new AppError('Forbidden', 403);
            }

            return;
        }

        throw new AppError('Forbidden', 403);
    }

    private normalizePatch(data: MedicalRecordPatchData, requireChange = false) {
        const normalized: NormalizedPatch = {};

        if (data.chiefComplaint !== undefined) {
            normalized.chiefComplaint = normalizeOptionalText(data.chiefComplaint);
        }

        if (data.vitals !== undefined) {
            normalized.vitals = data.vitals;
        }

        if (data.diagnosis !== undefined) {
            normalized.diagnosis = normalizeOptionalText(data.diagnosis);
        }

        if (data.treatmentPlan !== undefined) {
            normalized.treatmentPlan = normalizeOptionalText(data.treatmentPlan);
        }

        if (data.notes !== undefined) {
            normalized.notes = normalizeOptionalText(data.notes);
        }

        if (data.followUpInstructions !== undefined) {
            normalized.followUpInstructions = normalizeOptionalText(
                data.followUpInstructions,
            );
        }

        if (requireChange && !PATCH_FIELDS.some((field) => field in normalized)) {
            throw new AppError('At least one medical record field is required', 400);
        }

        return normalized;
    }

    private normalizeReason(reason: string) {
        try {
            return normalizeRequiredText(reason, 'Amendment reason');
        } catch (error) {
            throw new AppError((error as Error).message, 400);
        }
    }

    private snapshotRecord(record: MedicalRecordView) {
        return {
            id: record.id,
            patientId: record.patientId,
            appointmentId: record.appointmentId,
            staffProfileId: record.staffProfileId,
            departmentId: record.departmentId,
            chiefComplaint: record.chiefComplaint,
            vitals: record.vitals,
            diagnosis: record.diagnosis,
            treatmentPlan: record.treatmentPlan,
            notes: record.notes,
            followUpInstructions: record.followUpInstructions,
            isFinalized: record.isFinalized,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        };
    }
}
