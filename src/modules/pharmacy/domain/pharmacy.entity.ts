import { PharmacyStatus } from '../../../generated/prisma';

export interface PharmacyPatientSummary {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    allergies: unknown;
    name: string;
}

export interface PharmacyStaffSummary {
    id: string;
    userId: string;
    employeeCode: string;
    specialization: string | null;
    displayName: string;
}

export interface PharmacyPrescriptionSummary {
    id: string;
    issuedAt: Date;
    expiresAt: Date | null;
    notes: string | null;
    isVoided: boolean;
    staff: PharmacyStaffSummary;
}

export interface PharmacyPrescriptionItemSummary {
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
    durationInstructions: string | null;
    quantityPrescribed: number;
    quantityDispensed: number | null;
    notes: string | null;
}

export interface PharmacyInventoryItemSummary {
    id: string;
    sku: string;
    name: string;
    unitOfMeasure: string;
    currentStock: number;
    reorderLevel: number;
    unitCost: number | null;
    isActive: boolean;
}

export interface PharmacyDispensingItemView {
    id: string;
    pharmacyQueueId: string;
    prescriptionItemId: string;
    inventoryItemId: string | null;
    quantityToDispense: number;
    quantityDispensed: number | null;
    status: PharmacyStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    prescriptionItem: PharmacyPrescriptionItemSummary;
    inventoryItem: PharmacyInventoryItemSummary | null;
}

export interface PharmacyQueueView {
    id: string;
    prescriptionId: string;
    patientId: string;
    status: PharmacyStatus;
    requestedAt: Date;
    processedAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    patient: PharmacyPatientSummary;
    prescription: PharmacyPrescriptionSummary;
    dispensingItems: PharmacyDispensingItemView[];
}

export interface PharmacyQueueListResult {
    items: PharmacyQueueView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface PharmacyOutOfStockItem {
    prescriptionItemId: string;
    medicationName: string;
    dosage: string;
    quantityRequested: number;
}
