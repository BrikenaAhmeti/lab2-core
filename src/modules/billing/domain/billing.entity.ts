import {
    AppointmentStatus,
    BillingStatus,
    PaymentMethod,
} from '../../../generated/prisma';

export interface BillingPatientSummary {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    name: string;
}

export interface BillingAppointmentSummary {
    id: string;
    status: AppointmentStatus;
    scheduledAt: Date;
    endAt: Date;
    service: {
        id: string;
        name: string;
    };
}

export interface BillingItemView {
    id: string;
    billingId: string;
    serviceCatalogId: string | null;
    inventoryItemId: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sourceEntityType: string | null;
    sourceEntityId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentView {
    id: string;
    billingId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNumber: string | null;
    paidAt: Date;
    receivedByUserId: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface BillingView {
    id: string;
    patientId: string;
    appointmentId: string | null;
    billingNumber: string;
    status: BillingStatus;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    amountPaid: number;
    outstandingAmount: number;
    dueDate: Date | null;
    issuedAt: Date;
    paidAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    patient: BillingPatientSummary;
    appointment: BillingAppointmentSummary | null;
    items: BillingItemView[];
    payments: PaymentView[];
}

export interface BillingListResult {
    items: BillingView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface BillingStats {
    totalRevenue: number;
    outstanding: number;
    statusCounts: Record<BillingStatus, number>;
}

export interface BillingAppointmentSource {
    id: string;
    patientId: string;
    status: AppointmentStatus;
    scheduledAt: Date;
    endAt: Date;
    completedAt: Date | null;
    basePrice: number;
    serviceCatalogId: string;
    patient: BillingPatientSummary;
    service: {
        id: string;
        name: string;
        defaultPrice: number;
    };
    labOrders: Array<{
        id: string;
        items: Array<{
            id: string;
            labTest: {
                id: string;
                code: string;
                name: string;
                defaultPrice: number | null;
            };
        }>;
    }>;
    prescriptions: Array<{
        id: string;
        items: Array<{
            id: string;
            medicationName: string;
            dosage: string;
            quantityPrescribed: number;
        }>;
    }>;
}

export interface MedicationCatalogPrice {
    medicationName: string;
    inventoryItemId: string;
    unitCost: number | null;
}
