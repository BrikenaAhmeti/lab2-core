import {
    AppointmentStatus,
    LabOrderStatus,
    LabResultStatus,
} from '../../../generated/prisma';

export type LabOrderPriority = 'normal' | 'urgent';
export type LabResultFlag =
    | 'pending'
    | 'normal'
    | 'abnormal'
    | 'critical'
    | 'unavailable';

export interface LabTestEntity {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: string | null;
    sampleType: string | null;
    defaultPrice: unknown;
    referenceRange: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface LabTestListResult {
    items: LabTestEntity[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface LabOrderPatientSummary {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    name: string;
}

export interface LabOrderStaffSummary {
    id: string;
    userId: string;
    employeeCode: string;
    specialization: string | null;
    displayName: string;
}

export interface LabOrderDepartmentSummary {
    id: string;
    name: string;
    isActive: boolean;
}

export interface LabOrderAppointmentSummary {
    id: string;
    status: AppointmentStatus;
    scheduledAt: Date;
    endAt: Date;
}

export interface LabOrderMedicalRecordSummary {
    id: string;
    diagnosis: string | null;
    isFinalized: boolean;
    createdAt: Date;
}

export interface LabOrderItemView {
    id: string;
    labTestId: string;
    resultValue: string | null;
    resultUnit: string | null;
    resultNotes: string | null;
    resultStatus: LabResultStatus;
    isCritical: boolean;
    completedAt: Date | null;
    flag: LabResultFlag;
    labTest: {
        id: string;
        code: string;
        name: string;
        description: string | null;
        category: string | null;
        sampleType: string | null;
        defaultPrice: unknown;
        referenceRange: string | null;
        isActive: boolean;
    };
}

export interface LabOrderView {
    id: string;
    patientId: string;
    appointmentId: string | null;
    medicalRecordId: string | null;
    orderedByStaffId: string;
    departmentId: string;
    status: LabOrderStatus;
    priority: LabOrderPriority | null;
    notes: string | null;
    orderedAt: Date;
    collectedAt: Date | null;
    completedAt: Date | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    patient: LabOrderPatientSummary;
    appointment: LabOrderAppointmentSummary | null;
    medicalRecord: LabOrderMedicalRecordSummary | null;
    orderedByStaff: LabOrderStaffSummary;
    department: LabOrderDepartmentSummary;
    items: LabOrderItemView[];
}

export interface LabOrderListResult {
    items: LabOrderView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface LabOrderPatientLink {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    name: string;
}

export interface LabOrderAppointmentLink {
    id: string;
    patientId: string;
    staffProfileId: string | null;
    departmentId: string;
    status: AppointmentStatus;
    scheduledAt: Date;
    endAt: Date;
}

export interface LabOrderMedicalRecordLink {
    id: string;
    patientId: string;
    appointmentId: string | null;
    staffProfileId: string;
    departmentId: string;
    diagnosis: string | null;
    isFinalized: boolean;
    createdAt: Date;
}
