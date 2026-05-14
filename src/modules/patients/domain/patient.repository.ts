import { BloodType } from '../../../generated/prisma';
import {
    PatientEntity,
    PatientListResult,
    PatientTimelineItem,
} from './patient.entity';

export interface CreatePatientData {
    userId?: string | null;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: Date | null;
    gender?: string | null;
    bloodType?: BloodType | null;
    personalNumber?: string | null;
    personalNumberHash?: string | null;
    address?: string | null;
    emergencyContact?: string | null;
    emergencyPhone?: string | null;
    allergies?: unknown;
    medicalNotes?: unknown;
    actorUserId?: string;
    canCreateAll?: boolean;
}

export interface UpdatePatientData extends Partial<CreatePatientData> {
    isActive?: boolean;
}

export interface ListPatientsFilters {
    page: number;
    limit: number;
    search?: string;
    gender?: string;
    bloodType?: BloodType;
    personalNumberHash?: string | null;
}

export interface PatientRepository {
    create(data: CreatePatientData): Promise<PatientEntity>;
    findById(id: string): Promise<PatientEntity | null>;
    findByUserId(userId: string): Promise<PatientEntity | null>;
    findByEmail(email: string): Promise<PatientEntity | null>;
    findByPersonalNumberHash(hash: string): Promise<PatientEntity | null>;
    list(filters: ListPatientsFilters): Promise<PatientListResult>;
    update(id: string, data: UpdatePatientData): Promise<PatientEntity>;
    getTimeline(patientId: string): Promise<PatientTimelineItem[]>;
}
