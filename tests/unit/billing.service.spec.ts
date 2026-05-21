import {
    AppointmentStatus,
    BillingStatus,
    PaymentMethod,
} from '../../src/generated/prisma';
import {
    BillingAppointmentSource,
    BillingView,
} from '../../src/modules/billing/domain/billing.entity';
import { BillingRepository } from '../../src/modules/billing/domain/billing.repository';
import { BillingService } from '../../src/modules/billing/services/billing.service';

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const billingId = 'b14d4f97-281c-41b5-b6f4-215c4c620878';
const serviceId = '6f817061-d12c-42d1-8d57-24a0ddbd8b82';
const labOrderId = '0f79fa2f-2db3-4819-9c81-f0e51daeed51';
const labOrderItemId = '22c52439-b31f-4de8-9b0e-80dd54e47561';
const prescriptionItemId = '4149ce17-a874-4545-a51d-3f046c19af6f';
const inventoryItemId = '1a0d36f8-22f0-4ed3-912c-50f1dc4b706b';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';
const now = new Date('2026-05-21T12:00:00.000Z');

const patient = {
    id: patientId,
    userId: patientUserId,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@medsphere.local',
    phone: '+38344111222',
    name: 'Ada Lovelace',
};

const appointmentSource: BillingAppointmentSource = {
    id: appointmentId,
    patientId,
    status: AppointmentStatus.COMPLETED,
    scheduledAt: new Date('2026-05-21T09:00:00.000Z'),
    endAt: new Date('2026-05-21T09:30:00.000Z'),
    completedAt: new Date('2026-05-21T09:45:00.000Z'),
    basePrice: 50,
    serviceCatalogId: serviceId,
    patient,
    service: {
        id: serviceId,
        name: 'Initial Consultation',
        defaultPrice: 50,
    },
    labOrders: [
        {
            id: labOrderId,
            items: [
                {
                    id: labOrderItemId,
                    labTest: {
                        id: 'c16d8e7d-df2c-430a-a735-9b69dbed0747',
                        code: 'CBC',
                        name: 'Complete Blood Count',
                        defaultPrice: 20,
                    },
                },
            ],
        },
    ],
    prescriptions: [
        {
            id: '664e433c-7166-45f0-8d2d-5f03b7bbdb3c',
            items: [
                {
                    id: prescriptionItemId,
                    medicationName: 'Aspirin',
                    dosage: '81 mg',
                    quantityPrescribed: 30,
                },
            ],
        },
    ],
};

const billing: BillingView = {
    id: billingId,
    patientId,
    appointmentId,
    billingNumber: 'BILL-20260521-E61720AB',
    status: BillingStatus.PENDING,
    subtotal: 100,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 100,
    amountPaid: 0,
    outstandingAmount: 100,
    dueDate: new Date('2026-06-04T12:00:00.000Z'),
    issuedAt: now,
    paidAt: null,
    notes: 'Auto-generated after appointment completion',
    createdAt: now,
    updatedAt: now,
    patient,
    appointment: {
        id: appointmentId,
        status: AppointmentStatus.COMPLETED,
        scheduledAt: appointmentSource.scheduledAt,
        endAt: appointmentSource.endAt,
        service: {
            id: serviceId,
            name: 'Initial Consultation',
        },
    },
    items: [],
    payments: [],
};

function createRepositoryMock(): jest.Mocked<BillingRepository> {
    return {
        findPatientById: jest.fn(),
        findPatientByUserId: jest.fn(),
        findBillingById: jest.fn(),
        findBillingByAppointmentId: jest.fn(),
        findCompletedAppointmentForBilling: jest.fn(),
        findMedicationCatalogPrices: jest.fn(),
        createBilling: jest.fn(),
        listBillings: jest.fn(),
        updateBilling: jest.fn(),
        recordPayment: jest.fn(),
        getBillingStats: jest.fn(),
    };
}

describe('BillingService', () => {
    it('auto-generates appointment billing with consultation, lab, and medication items', async () => {
        const repository = createRepositoryMock();
        repository.findBillingByAppointmentId.mockResolvedValue(null);
        repository.findCompletedAppointmentForBilling.mockResolvedValue(appointmentSource);
        repository.findMedicationCatalogPrices.mockResolvedValue([
            {
                medicationName: 'Aspirin',
                inventoryItemId,
                unitCost: 1,
            },
        ]);
        repository.createBilling.mockResolvedValue(billing);
        const service = new BillingService(repository, () => now);

        const result = await service.autoGenerateFromAppointment(
            appointmentId,
            actorUserId,
        );

        expect(result.id).toBe(billingId);
        expect(repository.createBilling).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                appointmentId,
                billingNumber: 'BILL-20260521-E61720AB',
                subtotal: 100,
                totalAmount: 100,
                actorUserId,
                items: [
                    expect.objectContaining({
                        description: 'Consultation - Initial Consultation',
                        quantity: 1,
                        unitPrice: 50,
                        totalPrice: 50,
                    }),
                    expect.objectContaining({
                        description: 'Lab test - CBC Complete Blood Count',
                        quantity: 1,
                        unitPrice: 20,
                        totalPrice: 20,
                    }),
                    expect.objectContaining({
                        inventoryItemId,
                        description: 'Medication - Aspirin 81 mg',
                        quantity: 30,
                        unitPrice: 1,
                        totalPrice: 30,
                    }),
                ],
            }),
        );
    });

    it('returns existing appointment billing without creating a duplicate', async () => {
        const repository = createRepositoryMock();
        repository.findBillingByAppointmentId.mockResolvedValue(billing);
        const service = new BillingService(repository, () => now);

        const result = await service.autoGenerateFromAppointment(appointmentId);

        expect(result).toBe(billing);
        expect(repository.findCompletedAppointmentForBilling).not.toHaveBeenCalled();
        expect(repository.createBilling).not.toHaveBeenCalled();
    });

    it('records a partial payment and moves status to partially paid', async () => {
        const repository = createRepositoryMock();
        repository.findBillingById.mockResolvedValue(billing);
        repository.recordPayment.mockResolvedValue({
            ...billing,
            status: BillingStatus.PARTIALLY_PAID,
            amountPaid: 40,
            outstandingAmount: 60,
            payments: [
                {
                    id: '69bb0766-80b5-4585-bef8-e7ec7d11b1f0',
                    billingId,
                    amount: 40,
                    paymentMethod: PaymentMethod.CARD,
                    referenceNumber: 'CARD-001',
                    paidAt: now,
                    receivedByUserId: actorUserId,
                    notes: null,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
        });
        const service = new BillingService(repository, () => now);

        const result = await service.recordPayment(billingId, {
            amount: 40,
            paymentMethod: PaymentMethod.CARD,
            referenceNumber: ' CARD-001 ',
            actorUserId,
        });

        expect(result.status).toBe(BillingStatus.PARTIALLY_PAID);
        expect(repository.recordPayment).toHaveBeenCalledWith(
            billingId,
            expect.objectContaining({
                amount: 40,
                paymentMethod: PaymentMethod.CARD,
                referenceNumber: 'CARD-001',
                newAmountPaid: 40,
                newStatus: BillingStatus.PARTIALLY_PAID,
                billingPaidAt: null,
            }),
        );
    });

    it('blocks payments larger than the outstanding amount', async () => {
        const repository = createRepositoryMock();
        repository.findBillingById.mockResolvedValue(billing);
        const service = new BillingService(repository, () => now);

        await expect(
            service.recordPayment(billingId, {
                amount: 120,
                paymentMethod: PaymentMethod.CASH,
            }),
        ).rejects.toMatchObject({
            message: 'Payment amount exceeds outstanding balance',
            statusCode: 400,
        });

        expect(repository.recordPayment).not.toHaveBeenCalled();
    });

    it('scopes patient list reads to the authenticated patient', async () => {
        const repository = createRepositoryMock();
        repository.findPatientById.mockResolvedValue(patient);
        repository.listBillings.mockResolvedValue({
            items: [billing],
            meta: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
            },
        });
        const service = new BillingService(repository, () => now);

        await service.listBillings(
            {
                page: 1,
                limit: 10,
                patientId,
                status: BillingStatus.PENDING,
            },
            patientUserId,
            false,
        );

        expect(repository.listBillings).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                status: BillingStatus.PENDING,
            }),
        );
    });
});
