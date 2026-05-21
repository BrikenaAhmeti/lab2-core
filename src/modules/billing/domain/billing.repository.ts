import {
    BillingStatus,
    PaymentMethod,
} from '../../../generated/prisma';
import {
    BillingAppointmentSource,
    BillingListResult,
    BillingPatientSummary,
    BillingStats,
    BillingView,
    MedicationCatalogPrice,
} from './billing.entity';

export interface ListBillingsFilters {
    page: number;
    limit: number;
    patientId?: string;
    status?: BillingStatus;
    from?: Date;
    to?: Date;
}

export interface BillingLineItemData {
    serviceCatalogId?: string | null;
    inventoryItemId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sourceEntityType?: string | null;
    sourceEntityId?: string | null;
}

export interface CreateBillingData {
    patientId: string;
    appointmentId?: string | null;
    billingNumber: string;
    status: BillingStatus;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    dueDate?: Date | null;
    issuedAt: Date;
    notes?: string | null;
    items: BillingLineItemData[];
    actorUserId?: string;
}

export interface UpdateBillingData {
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    dueDate?: Date | null;
    notes?: string | null;
    items?: BillingLineItemData[];
    actorUserId?: string;
}

export interface RecordPaymentData {
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string | null;
    paidAt: Date;
    receivedByUserId?: string;
    notes?: string | null;
    newAmountPaid: number;
    newStatus: BillingStatus;
    billingPaidAt?: Date | null;
}

export interface BillingStatsFilters {
    from?: Date;
    to?: Date;
}

export interface BillingRepository {
    findPatientById(id: string): Promise<BillingPatientSummary | null>;
    findPatientByUserId(userId: string): Promise<BillingPatientSummary | null>;
    findBillingById(id: string): Promise<BillingView | null>;
    findBillingByAppointmentId(appointmentId: string): Promise<BillingView | null>;
    findCompletedAppointmentForBilling(
        appointmentId: string,
    ): Promise<BillingAppointmentSource | null>;
    findMedicationCatalogPrices(
        medicationNames: string[],
    ): Promise<MedicationCatalogPrice[]>;
    createBilling(data: CreateBillingData): Promise<BillingView>;
    listBillings(filters: ListBillingsFilters): Promise<BillingListResult>;
    updateBilling(id: string, data: UpdateBillingData): Promise<BillingView>;
    recordPayment(id: string, data: RecordPaymentData): Promise<BillingView>;
    getBillingStats(filters: BillingStatsFilters): Promise<BillingStats>;
}
