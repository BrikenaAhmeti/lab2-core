import { BloodType } from '../../../generated/prisma';

export interface PatientEntity {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    bloodType: BloodType | null;
    personalNumber: string | null;
    address: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    allergies: unknown;
    medicalNotes: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PatientListResult {
    items: PatientEntity[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface LinkPatientByPersonalNumberResult {
    linked: boolean;
    patientId: string | null;
    userId: string;
}

export type PatientTimelineType =
    | 'appointment'
    | 'medical_record'
    | 'prescription'
    | 'lab_order'
    | 'billing';

export interface PatientTimelineItem {
    id: string;
    type: PatientTimelineType;
    occurredAt: Date;
    title: string;
    status?: string | null;
    summary?: string | null;
    reference: {
        entity: string;
        id: string;
    };
}
