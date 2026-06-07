import jwt from 'jsonwebtoken';
import request from 'supertest';
import {
    AppointmentStatus,
    BillingStatus,
    PaymentMethod,
} from '../../src/generated/prisma';
import { BillingView } from '../../src/modules/billing/domain/billing.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'billing-routes-test-secret';
process.env.FRONTEND_ORIGINS = '';

const { createApp } = require('../../src/app');
const {
    BillingPrismaRepository,
} = require('../../src/modules/billing/infrastructure/billing.prisma.repository');

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const billingId = 'b14d4f97-281c-41b5-b6f4-215c4c620878';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';

const billing: BillingView = {
    id: billingId,
    patientId,
    appointmentId,
    billingNumber: 'BILL-20260521-E61720AB',
    status: BillingStatus.PENDING,
    subtotal: 80,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 80,
    amountPaid: 0,
    outstandingAmount: 80,
    dueDate: new Date('2026-06-04T12:00:00.000Z'),
    issuedAt: new Date('2026-05-21T12:00:00.000Z'),
    paidAt: null,
    notes: 'Auto-generated after appointment completion',
    createdAt: new Date('2026-05-21T12:00:00.000Z'),
    updatedAt: new Date('2026-05-21T12:00:00.000Z'),
    patient: {
        id: patientId,
        userId: patientUserId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@medsphere.local',
        phone: '+38344111222',
        name: 'Ada Lovelace',
    },
    appointment: {
        id: appointmentId,
        status: AppointmentStatus.COMPLETED,
        scheduledAt: new Date('2026-05-21T09:00:00.000Z'),
        endAt: new Date('2026-05-21T09:30:00.000Z'),
        service: {
            id: '6f817061-d12c-42d1-8d57-24a0ddbd8b82',
            name: 'Initial Consultation',
        },
    },
    items: [
        {
            id: 'ea68a709-c87c-4599-84d6-d6f19fdd0d8e',
            billingId,
            serviceCatalogId: '6f817061-d12c-42d1-8d57-24a0ddbd8b82',
            inventoryItemId: null,
            description: 'Consultation - Initial Consultation',
            quantity: 1,
            unitPrice: 80,
            totalPrice: 80,
            sourceEntityType: 'appointment',
            sourceEntityId: appointmentId,
            createdAt: new Date('2026-05-21T12:00:00.000Z'),
            updatedAt: new Date('2026-05-21T12:00:00.000Z'),
        },
    ],
    payments: [],
};

function createAccessToken(permissions: string[], sub = actorUserId) {
    return jwt.sign(
        {
            sub,
            email: 'billing@medsphere.local',
            roles: ['Admin'],
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

describe('Billing routes', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('lists billings with filters', async () => {
        const listSpy = jest
            .spyOn(BillingPrismaRepository.prototype, 'listBillings')
            .mockResolvedValue({
                items: [billing],
                meta: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1,
                },
            });

        const response = await request(app)
            .get(`/api/billings?patientId=${patientId}&search=Ada%20Lovelace&status=PENDING`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['billing:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(listSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                search: 'Ada Lovelace',
                status: BillingStatus.PENDING,
            }),
        );
    });

    it('updates an unpaid billing with a manual line item', async () => {
        jest.spyOn(
            BillingPrismaRepository.prototype,
            'findBillingById',
        ).mockResolvedValue(billing);
        const updateSpy = jest
            .spyOn(BillingPrismaRepository.prototype, 'updateBilling')
            .mockResolvedValue({
                ...billing,
                subtotal: 95,
                totalAmount: 95,
                outstandingAmount: 95,
                items: [
                    ...billing.items,
                    {
                        id: '32353b23-2dbf-45ff-b238-f9f03649f321',
                        billingId,
                        serviceCatalogId: null,
                        inventoryItemId: null,
                        description: 'Manual supply charge',
                        quantity: 1,
                        unitPrice: 15,
                        totalPrice: 15,
                        sourceEntityType: null,
                        sourceEntityId: null,
                        createdAt: billing.createdAt,
                        updatedAt: billing.updatedAt,
                    },
                ],
            });

        const response = await request(app)
            .put(`/api/billings/${billingId}`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['billing:manage:all'])}`,
            )
            .send({
                items: [
                    {
                        description: ' Manual   supply charge ',
                        quantity: 1,
                        unitPrice: 15,
                    },
                ],
            });

        expect(response.status).toBe(200);
        expect(response.body.totalAmount).toBe(95);
        expect(updateSpy).toHaveBeenCalledWith(
            billingId,
            expect.objectContaining({
                subtotal: 95,
                totalAmount: 95,
                items: [
                    expect.objectContaining({
                        description: 'Manual supply charge',
                        totalPrice: 15,
                    }),
                ],
            }),
        );
    });

    it('records a billing payment', async () => {
        jest.spyOn(
            BillingPrismaRepository.prototype,
            'findBillingById',
        ).mockResolvedValue(billing);
        const paymentSpy = jest
            .spyOn(BillingPrismaRepository.prototype, 'recordPayment')
            .mockResolvedValue({
                ...billing,
                status: BillingStatus.PARTIALLY_PAID,
                amountPaid: 25,
                outstandingAmount: 55,
            });

        const response = await request(app)
            .post(`/api/billings/${billingId}/payments`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['billing:manage:all'])}`,
            )
            .send({
                amount: 25,
                paymentMethod: 'CARD',
                referenceNumber: ' CARD-001 ',
            });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe(BillingStatus.PARTIALLY_PAID);
        expect(paymentSpy).toHaveBeenCalledWith(
            billingId,
            expect.objectContaining({
                amount: 25,
                paymentMethod: PaymentMethod.CARD,
                referenceNumber: 'CARD-001',
                newAmountPaid: 25,
                newStatus: BillingStatus.PARTIALLY_PAID,
            }),
        );
    });

    it('downloads a billing PDF', async () => {
        jest.spyOn(
            BillingPrismaRepository.prototype,
            'findBillingById',
        ).mockResolvedValue(billing);

        const response = await request(app)
            .get(`/api/billings/${billingId}/pdf`)
            .set(
                'Authorization',
                `Bearer ${createAccessToken(['billing:read:all'])}`,
            );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/pdf');
        expect(response.headers['content-disposition']).toBe(
            'attachment; filename="ada-lovelace-2026-05-21-bill-20260521-e61720ab.pdf"',
        );
        expect(response.body.length).toBeGreaterThan(0);
    });
});
