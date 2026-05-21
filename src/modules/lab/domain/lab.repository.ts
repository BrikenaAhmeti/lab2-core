import { LabOrderStatus, LabResultStatus } from '../../../generated/prisma';
import {
    LabOrderAppointmentLink,
    LabOrderListResult,
    LabOrderMedicalRecordLink,
    LabOrderPatientLink,
    LabOrderPriority,
    LabOrderView,
    LabTestEntity,
    LabTestListResult,
} from './lab.entity';

export interface ListLabTestsFilters {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    isActive?: boolean;
}

export interface CreateLabTestData {
    code: string;
    name: string;
    description?: string | null;
    category?: string | null;
    sampleType?: string | null;
    defaultPrice?: number | null;
    referenceRange?: string | null;
    isActive: boolean;
    actorUserId?: string;
}

export interface UpdateLabTestData {
    code?: string;
    name?: string;
    description?: string | null;
    category?: string | null;
    sampleType?: string | null;
    defaultPrice?: number | null;
    referenceRange?: string | null;
    isActive?: boolean;
    actorUserId?: string;
}

export interface CreateLabOrderData {
    patientId: string;
    appointmentId?: string | null;
    medicalRecordId?: string | null;
    orderedByStaffId: string;
    departmentId: string;
    priority?: LabOrderPriority | null;
    notes?: string | null;
    items: Array<{
        labTestId: string;
    }>;
    actorUserId?: string;
}

export interface ListLabOrdersFilters {
    page: number;
    limit: number;
    patientId?: string;
    status?: LabOrderStatus;
    priority?: LabOrderPriority;
    from?: Date;
    to?: Date;
}

export interface UpdateLabOrderStatusData {
    status: LabOrderStatus;
    collectedAt?: Date | null;
    completedAt?: Date | null;
    actorUserId?: string;
}

export interface EnterLabOrderResultsData {
    items: Array<{
        itemId: string;
        resultValue: string;
        resultUnit?: string | null;
        resultNotes?: string | null;
        resultStatus: LabResultStatus;
        isCritical: boolean;
        completedAt?: Date | null;
    }>;
    actorUserId?: string;
}

export interface ReviewLabOrderData {
    reviewedAt: Date;
    notes?: string | null;
    actorUserId?: string;
}

export interface LabRepository {
    createLabTest(data: CreateLabTestData): Promise<LabTestEntity>;
    findLabTestById(id: string): Promise<LabTestEntity | null>;
    findLabTestByCode(code: string): Promise<LabTestEntity | null>;
    findLabTestsByIds(ids: string[]): Promise<LabTestEntity[]>;
    listLabTests(filters: ListLabTestsFilters): Promise<LabTestListResult>;
    updateLabTest(id: string, data: UpdateLabTestData): Promise<LabTestEntity>;
    deactivateLabTest(id: string, actorUserId?: string): Promise<LabTestEntity>;
    findPatientById(id: string): Promise<LabOrderPatientLink | null>;
    findPatientByUserId(userId: string): Promise<LabOrderPatientLink | null>;
    findAppointmentById(id: string): Promise<LabOrderAppointmentLink | null>;
    findMedicalRecordById(id: string): Promise<LabOrderMedicalRecordLink | null>;
    createLabOrder(data: CreateLabOrderData): Promise<LabOrderView>;
    findLabOrderById(id: string): Promise<LabOrderView | null>;
    listLabOrders(filters: ListLabOrdersFilters): Promise<LabOrderListResult>;
    listPendingLabOrders(): Promise<LabOrderView[]>;
    updateLabOrderStatus(
        id: string,
        data: UpdateLabOrderStatusData,
    ): Promise<LabOrderView>;
    enterLabOrderResults(
        id: string,
        data: EnterLabOrderResultsData,
    ): Promise<LabOrderView>;
    reviewLabOrder(id: string, data: ReviewLabOrderData): Promise<LabOrderView>;
}
