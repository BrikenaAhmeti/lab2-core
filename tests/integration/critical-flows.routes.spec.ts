import jwt from 'jsonwebtoken';
import request from 'supertest';
import {
    AppointmentStatus,
    AppointmentType,
    BillingStatus,
    LabOrderStatus,
    LabResultStatus,
    PaymentMethod,
    PharmacyStatus,
} from '../../src/generated/prisma';
import type { AppointmentView } from '../../src/modules/appointments/domain/appointment.entity';
import type {
    BillingAppointmentSource,
    BillingView,
} from '../../src/modules/billing/domain/billing.entity';
import type { LabOrderView, LabTestEntity } from '../../src/modules/lab/domain/lab.entity';
import type { MedicalRecordView } from '../../src/modules/medical-records/domain/medical-record.entity';
import type { PharmacyQueueView } from '../../src/modules/pharmacy/domain/pharmacy.entity';
import type { PrescriptionView } from '../../src/modules/prescriptions/domain/prescription.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'critical-flows-test-secret';
process.env.FRONTEND_ORIGINS = '';
process.env.REDIS_URL = '';
process.env.NOTIFICATION_SERVICE_URL = '';
process.env.INTERNAL_API_KEY = '';

const { createApp } = require('../../src/app');
const {
    AppointmentPrismaRepository,
} = require('../../src/modules/appointments/infrastructure/appointment.prisma.repository');
const {
    SchedulePrismaRepository,
} = require('../../src/modules/schedules/infrastructure/schedule.prisma.repository');
const {
    BillingPrismaRepository,
} = require('../../src/modules/billing/infrastructure/billing.prisma.repository');
const {
    MedicalRecordPrismaRepository,
} = require('../../src/modules/medical-records/infrastructure/medical-record.prisma.repository');
const {
    PrescriptionPrismaRepository,
} = require('../../src/modules/prescriptions/infrastructure/prescription.prisma.repository');
const {
    LabPrismaRepository,
} = require('../../src/modules/lab/infrastructure/lab.prisma.repository');
const {
    PharmacyPrismaRepository,
} = require('../../src/modules/pharmacy/infrastructure/pharmacy.prisma.repository');
const {
    HttpNotificationClient,
} = require('../../src/shared/notifications/notification-client');

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = 'b9fc5d6a-1af8-49a2-8467-2a60ceef7057';
const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const serviceId = '6f817061-d12c-42d1-8d57-24a0ddbd8b82';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const doctorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';
const pharmacistUserId = '2cded68b-2455-4104-87ea-cc3b78d2aa6a';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const medicalRecordId = '2fb8b77f-0a57-4c85-89f7-9222da1fcb12';
const prescriptionId = '664e433c-7166-45f0-8d2d-5f03b7bbdb3c';
const prescriptionItemId = '4149ce17-a874-4545-a51d-3f046c19af6f';
const pharmacyQueueId = 'f8b1b3b1-7186-492f-87bb-1d194da8e0fe';
const labTestId = 'c16d8e7d-df2c-430a-a735-9b69dbed0747';
const labOrderId = '0f79fa2f-2db3-4819-9c81-f0e51daeed51';
const labOrderItemId = '22c52439-b31f-4de8-9b0e-80dd54e47561';
const billingId = 'b14d4f97-281c-41b5-b6f4-215c4c620878';
const inventoryItemId = '1a0d36f8-22f0-4ed3-912c-50f1dc4b706b';
const scheduledAt = new Date('2030-01-02T09:00:00.000Z');
const endAt = new Date('2030-01-02T09:30:00.000Z');
const createdAt = new Date('2026-05-21T08:00:00.000Z');

const department = {
    id: departmentId,
    name: 'Cardiology',
    isActive: true,
};

const patient = {
    id: patientId,
    userId: patientUserId,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@medsphere.local',
    phone: '+38344111222',
    allergies: ['penicillin'],
    name: 'Ada Lovelace',
};

const staff = {
    id: staffProfileId,
    userId: doctorUserId,
    employeeCode: 'DR-001',
    specialization: 'Cardiologist',
    displayName: 'DR-001 - Cardiologist',
};

const appointmentService = {
    id: serviceId,
    departmentId,
    name: 'Initial Consultation',
    defaultDurationMinutes: 30,
    defaultPrice: 80,
    isActive: true,
    department,
};

const labTest: LabTestEntity = {
    id: labTestId,
    code: 'CBC',
    name: 'Complete Blood Count',
    description: 'Standard CBC panel',
    category: 'Hematology',
    sampleType: 'Blood',
    defaultPrice: 20,
    referenceRange: '4.0-10.0',
    isActive: true,
    createdAt,
    updatedAt: createdAt,
};

function createAccessToken(
    permissions: string[],
    sub = doctorUserId,
    roles = ['Admin'],
) {
    return jwt.sign(
        {
            sub,
            email: 'flow@medsphere.local',
            roles,
            permissions,
        },
        process.env.JWT_ACCESS_SECRET as string,
    );
}

function appointmentView(
    status: AppointmentStatus,
    overrides: Partial<AppointmentView> = {},
): AppointmentView {
    return {
        id: appointmentId,
        patientId,
        departmentId,
        serviceCatalogId: serviceId,
        staffProfileId,
        status,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt,
        endAt,
        durationMinutes: 30,
        basePrice: 80,
        notes: 'New patient',
        checkedInAt: status === AppointmentStatus.CHECKED_IN ? new Date() : null,
        completedAt: status === AppointmentStatus.COMPLETED ? new Date() : null,
        cancelledAt: null,
        cancellationNote: null,
        createdAt,
        updatedAt: createdAt,
        patient,
        staff,
        service: {
            id: serviceId,
            name: appointmentService.name,
            defaultDurationMinutes: 30,
            defaultPrice: 80,
        },
        department,
        ...overrides,
    };
}

function billingView(
    status: BillingStatus,
    overrides: Partial<BillingView> = {},
): BillingView {
    const amountPaid = overrides.amountPaid ?? 0;
    const totalAmount = overrides.totalAmount ?? 80;

    return {
        id: billingId,
        patientId,
        appointmentId,
        billingNumber: 'BILL-20260521-E61720AB',
        status,
        subtotal: totalAmount,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount,
        amountPaid,
        outstandingAmount: totalAmount - amountPaid,
        dueDate: new Date('2026-06-04T12:00:00.000Z'),
        issuedAt: new Date('2026-05-21T12:00:00.000Z'),
        paidAt: status === BillingStatus.PAID ? new Date('2026-05-21T12:05:00.000Z') : null,
        notes: 'Auto-generated after appointment completion',
        createdAt,
        updatedAt: createdAt,
        patient,
        appointment: {
            id: appointmentId,
            status: AppointmentStatus.COMPLETED,
            scheduledAt,
            endAt,
            service: {
                id: serviceId,
                name: appointmentService.name,
            },
        },
        items: [
            {
                id: 'ea68a709-c87c-4599-84d6-d6f19fdd0d8e',
                billingId,
                serviceCatalogId: serviceId,
                inventoryItemId: null,
                description: 'Consultation - Initial Consultation',
                quantity: 1,
                unitPrice: totalAmount,
                totalPrice: totalAmount,
                sourceEntityType: 'appointment',
                sourceEntityId: appointmentId,
                createdAt,
                updatedAt: createdAt,
            },
        ],
        payments: [],
        ...overrides,
    };
}

function medicalRecordView(): MedicalRecordView {
    return {
        id: medicalRecordId,
        patientId,
        appointmentId,
        staffProfileId,
        departmentId,
        chiefComplaint: 'Fatigue',
        vitals: { bloodPressure: '120/80' },
        diagnosis: 'Stable angina',
        treatmentPlan: 'Continue monitoring',
        notes: null,
        followUpInstructions: 'Follow up in two weeks',
        isFinalized: false,
        createdAt,
        updatedAt: createdAt,
        patient,
        appointment: {
            id: appointmentId,
            status: AppointmentStatus.IN_PROGRESS,
            scheduledAt,
            endAt,
        },
        staff,
        department,
        amendments: [],
        prescriptions: [],
        labOrders: [],
    };
}

function prescriptionView(): PrescriptionView {
    return {
        id: prescriptionId,
        patientId,
        medicalRecordId,
        appointmentId,
        staffProfileId,
        issuedAt: new Date('2026-05-21T08:30:00.000Z'),
        expiresAt: new Date('2026-06-21T08:30:00.000Z'),
        notes: 'Take after meals',
        isVoided: false,
        voidedAt: null,
        voidReason: null,
        voidedByUserId: null,
        status: 'ACTIVE',
        pharmacyStatus: PharmacyStatus.PENDING,
        createdAt,
        updatedAt: createdAt,
        patient,
        medicalRecord: {
            id: medicalRecordId,
            diagnosis: 'Stable angina',
            isFinalized: false,
            createdAt,
        },
        appointment: {
            id: appointmentId,
            status: AppointmentStatus.IN_PROGRESS,
            scheduledAt,
            endAt,
        },
        staff,
        items: [
            {
                id: prescriptionItemId,
                medicationName: 'Aspirin',
                dosage: '81 mg',
                frequency: 'Once daily',
                durationInstructions: '30 days',
                quantityPrescribed: 30,
                quantityDispensed: null,
                notes: null,
                createdAt,
                updatedAt: createdAt,
            },
        ],
        pharmacyQueue: [
            {
                id: pharmacyQueueId,
                status: PharmacyStatus.PENDING,
                requestedAt: new Date('2026-05-21T08:30:00.000Z'),
                processedAt: null,
                notes: null,
                dispensingItems: [
                    {
                        id: 'f8b1b3b1-7186-492f-87bb-1d194da8e0aa1',
                        prescriptionItemId,
                        inventoryItemId: null,
                        quantityToDispense: 30,
                        quantityDispensed: null,
                        status: PharmacyStatus.PENDING,
                        notes: null,
                    },
                ],
            },
        ],
    };
}

function labOrderView(
    status: LabOrderStatus,
    overrides: Partial<LabOrderView> = {},
): LabOrderView {
    return {
        id: labOrderId,
        patientId,
        appointmentId,
        medicalRecordId,
        orderedByStaffId: staffProfileId,
        departmentId,
        status,
        priority: 'urgent',
        notes: 'Draw before medication',
        orderedAt: new Date('2026-05-21T08:10:00.000Z'),
        collectedAt: status === LabOrderStatus.COLLECTED ? new Date() : null,
        completedAt: status === LabOrderStatus.COMPLETED ? new Date() : null,
        reviewedAt: null,
        createdAt,
        updatedAt: createdAt,
        patient,
        appointment: {
            id: appointmentId,
            status: AppointmentStatus.IN_PROGRESS,
            scheduledAt,
            endAt,
        },
        medicalRecord: {
            id: medicalRecordId,
            diagnosis: 'Stable angina',
            isFinalized: false,
            createdAt,
        },
        orderedByStaff: staff,
        department,
        items: [
            {
                id: labOrderItemId,
                labTestId,
                resultValue: null,
                resultUnit: null,
                resultNotes: null,
                resultStatus: LabResultStatus.PENDING,
                isCritical: false,
                completedAt: null,
                flag: 'pending',
                labTest,
            },
        ],
        ...overrides,
    };
}

function pharmacyQueueView(
    status: PharmacyStatus,
    overrides: Partial<PharmacyQueueView> = {},
): PharmacyQueueView {
    return {
        id: pharmacyQueueId,
        prescriptionId,
        patientId,
        status,
        requestedAt: new Date('2026-05-21T08:30:00.000Z'),
        processedAt: null,
        notes: null,
        createdAt,
        updatedAt: createdAt,
        patient,
        prescription: {
            id: prescriptionId,
            issuedAt: new Date('2026-05-21T08:30:00.000Z'),
            expiresAt: null,
            notes: null,
            isVoided: false,
            staff,
        },
        dispensingItems: [
            {
                id: 'f8b1b3b1-7186-492f-87bb-1d194da8e0aa1',
                pharmacyQueueId,
                prescriptionItemId,
                inventoryItemId: null,
                quantityToDispense: 30,
                quantityDispensed: null,
                status: PharmacyStatus.PENDING,
                notes: null,
                createdAt,
                updatedAt: createdAt,
                prescriptionItem: {
                    id: prescriptionItemId,
                    medicationName: 'Aspirin',
                    dosage: '81 mg',
                    frequency: 'Once daily',
                    durationInstructions: '30 days',
                    quantityPrescribed: 30,
                    quantityDispensed: null,
                    notes: null,
                },
                inventoryItem: null,
            },
        ],
        ...overrides,
    };
}

function mockAppointmentAvailability() {
    jest.spyOn(SchedulePrismaRepository.prototype, 'findStaffById').mockResolvedValue({
        id: staffProfileId,
        employmentStatus: 'ACTIVE',
        departments: [
            {
                departmentId,
                unassignedAt: null,
                department,
            },
        ],
    });
    jest.spyOn(SchedulePrismaRepository.prototype, 'findServiceById').mockResolvedValue({
        id: serviceId,
        departmentId,
        defaultDurationMinutes: 30,
        isActive: true,
    });
    jest.spyOn(SchedulePrismaRepository.prototype, 'listSchedulesForDay').mockResolvedValue([
        {
            id: 'schedule-1',
            staffProfileId,
            departmentId,
            dayOfWeek: scheduledAt.getUTCDay(),
            startTime: '09:00',
            endTime: '10:00',
            slotDurationMinutes: 30,
            breakStart: null,
            breakEnd: null,
            validFrom: null,
            validTo: null,
            isActive: true,
            createdAt,
            updatedAt: createdAt,
        },
    ]);
    jest.spyOn(SchedulePrismaRepository.prototype, 'listExceptionsForDate').mockResolvedValue([]);
    jest.spyOn(SchedulePrismaRepository.prototype, 'listBookedAppointments').mockResolvedValue([]);
}

describe('MS-47 critical integration flows', () => {
    const app = createApp();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it('books an appointment, rejects a slot conflict, completes it, and auto-generates billing', async () => {
        let currentAppointment = appointmentView(AppointmentStatus.SCHEDULED);
        const completedAppointmentSource: BillingAppointmentSource = {
            id: appointmentId,
            patientId,
            status: AppointmentStatus.COMPLETED,
            scheduledAt,
            endAt,
            completedAt: new Date('2030-01-02T09:30:00.000Z'),
            basePrice: 80,
            serviceCatalogId: serviceId,
            patient,
            service: {
                id: serviceId,
                name: appointmentService.name,
                defaultPrice: 80,
            },
            labOrders: [],
            prescriptions: [],
        };
        const createBillingSpy = jest
            .spyOn(BillingPrismaRepository.prototype, 'createBilling')
            .mockImplementation(async (data: any) =>
                billingView(BillingStatus.PENDING, {
                    appointmentId: data.appointmentId,
                    subtotal: data.subtotal,
                    totalAmount: data.totalAmount,
                    outstandingAmount: data.totalAmount,
                    items: data.items.map((item: any, index: number) => ({
                        id: `billing-item-${index}`,
                        billingId,
                        serviceCatalogId: item.serviceCatalogId ?? null,
                        inventoryItemId: item.inventoryItemId ?? null,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        sourceEntityType: item.sourceEntityType ?? null,
                        sourceEntityId: item.sourceEntityId ?? null,
                        createdAt,
                        updatedAt: createdAt,
                    })),
                }),
            );

        mockAppointmentAvailability();
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findPatientById').mockResolvedValue(patient);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findServiceById').mockResolvedValue(appointmentService);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findStaffById').mockResolvedValue({
            ...staff,
            employmentStatus: 'ACTIVE',
            departments: [
                {
                    departmentId,
                    unassignedAt: null,
                    department,
                },
            ],
        });
        jest
            .spyOn(AppointmentPrismaRepository.prototype, 'countConflictingAppointments')
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(1);
        jest.spyOn(AppointmentPrismaRepository.prototype, 'create').mockImplementation(async () => {
            currentAppointment = appointmentView(AppointmentStatus.SCHEDULED);
            return currentAppointment;
        });
        jest.spyOn(AppointmentPrismaRepository.prototype, 'findById').mockImplementation(async () => currentAppointment);
        jest
            .spyOn(AppointmentPrismaRepository.prototype, 'updateStatus')
            .mockImplementation(async (...args: unknown[]) => {
                const data = args[1] as any;
                currentAppointment = appointmentView(data.status, {
                    checkedInAt: data.checkedInAt ?? currentAppointment.checkedInAt,
                    completedAt: data.completedAt ?? currentAppointment.completedAt,
                    cancelledAt: data.cancelledAt ?? currentAppointment.cancelledAt,
                    cancellationNote: data.cancellationNote ?? currentAppointment.cancellationNote,
                });
                return currentAppointment;
            });
        jest.spyOn(BillingPrismaRepository.prototype, 'findBillingByAppointmentId').mockResolvedValue(null);
        jest
            .spyOn(BillingPrismaRepository.prototype, 'findCompletedAppointmentForBilling')
            .mockResolvedValue(completedAppointmentSource);
        jest.spyOn(BillingPrismaRepository.prototype, 'findMedicationCatalogPrices').mockResolvedValue([]);

        const token = createAccessToken([
            'appointments:create:all',
            'appointments:update:all',
        ]);

        const bookingResponse = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${token}`)
            .send({
                patientId,
                serviceCatalogId: serviceId,
                staffProfileId,
                scheduledAt: scheduledAt.toISOString(),
                notes: ' New patient ',
            });

        expect(bookingResponse.status).toBe(201);
        expect(bookingResponse.body.status).toBe(AppointmentStatus.SCHEDULED);

        const conflictResponse = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${token}`)
            .send({
                patientId,
                serviceCatalogId: serviceId,
                staffProfileId,
                scheduledAt: scheduledAt.toISOString(),
            });

        expect(conflictResponse.status).toBe(409);
        expect(conflictResponse.body.message).toBe('Appointment slot is already booked');

        const checkInResponse = await request(app)
            .patch(`/api/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ action: 'check-in' });

        expect(checkInResponse.status).toBe(200);
        expect(checkInResponse.body.status).toBe(AppointmentStatus.CHECKED_IN);

        const startResponse = await request(app)
            .patch(`/api/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ action: 'start' });

        expect(startResponse.status).toBe(200);
        expect(startResponse.body.status).toBe(AppointmentStatus.IN_PROGRESS);

        const completeResponse = await request(app)
            .patch(`/api/appointments/${appointmentId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ action: 'complete' });

        expect(completeResponse.status).toBe(200);
        expect(completeResponse.body.status).toBe(AppointmentStatus.COMPLETED);
        expect(createBillingSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                appointmentId,
                status: BillingStatus.PENDING,
                totalAmount: 80,
                items: [
                    expect.objectContaining({
                        description: 'Consultation - Initial Consultation',
                        sourceEntityType: 'appointment',
                        sourceEntityId: appointmentId,
                    }),
                ],
            }),
        );
    });

    it('runs the clinical path from medical record to prescription, lab results, review notification', async () => {
        let labOrderState = labOrderView(LabOrderStatus.PENDING);
        const record = medicalRecordView();
        const prescription = prescriptionView();
        const notificationSpy = jest
            .spyOn(HttpNotificationClient.prototype, 'send')
            .mockResolvedValue(undefined);

        jest
            .spyOn(MedicalRecordPrismaRepository.prototype, 'findAppointmentById')
            .mockResolvedValue({
                id: appointmentId,
                patientId,
                staffProfileId,
                departmentId,
                status: AppointmentStatus.IN_PROGRESS,
                scheduledAt,
                endAt,
            });
        jest.spyOn(MedicalRecordPrismaRepository.prototype, 'create').mockResolvedValue(record);
        jest.spyOn(PrescriptionPrismaRepository.prototype, 'findMedicalRecordById').mockResolvedValue({
            id: medicalRecordId,
            patientId,
            appointmentId,
            staffProfileId,
            diagnosis: 'Stable angina',
            isFinalized: false,
            createdAt,
        });
        jest
            .spyOn(PrescriptionPrismaRepository.prototype, 'createWithPharmacyQueue')
            .mockResolvedValue(prescription);
        jest.spyOn(LabPrismaRepository.prototype, 'findAppointmentById').mockResolvedValue({
            id: appointmentId,
            patientId,
            staffProfileId,
            departmentId,
            status: AppointmentStatus.IN_PROGRESS,
            scheduledAt,
            endAt,
        });
        jest.spyOn(LabPrismaRepository.prototype, 'findMedicalRecordById').mockResolvedValue({
            id: medicalRecordId,
            patientId,
            appointmentId,
            staffProfileId,
            departmentId,
            diagnosis: 'Stable angina',
            isFinalized: false,
            createdAt,
        });
        jest.spyOn(LabPrismaRepository.prototype, 'findLabTestsByIds').mockResolvedValue([labTest]);
        jest.spyOn(LabPrismaRepository.prototype, 'createLabOrder').mockImplementation(async () => {
            labOrderState = labOrderView(LabOrderStatus.PENDING);
            return labOrderState;
        });
        jest
            .spyOn(LabPrismaRepository.prototype, 'findLabOrderById')
            .mockImplementation(async () => labOrderState);
        jest
            .spyOn(LabPrismaRepository.prototype, 'updateLabOrderStatus')
            .mockImplementation(async (...args: unknown[]) => {
                const data = args[1] as any;
                labOrderState = {
                    ...labOrderState,
                    status: data.status,
                    collectedAt: data.collectedAt ?? labOrderState.collectedAt,
                    completedAt: data.completedAt ?? labOrderState.completedAt,
                };
                return labOrderState;
            });
        jest
            .spyOn(LabPrismaRepository.prototype, 'enterLabOrderResults')
            .mockImplementation(async (...args: unknown[]) => {
                const data = args[1] as any;
                const result = data.items[0];
                labOrderState = {
                    ...labOrderState,
                    items: labOrderState.items.map((item) => ({
                        ...item,
                        resultValue: result.resultValue,
                        resultUnit: result.resultUnit,
                        resultNotes: result.resultNotes,
                        resultStatus: result.resultStatus,
                        isCritical: result.isCritical,
                        completedAt: result.completedAt,
                        flag: result.isCritical ? 'critical' : 'abnormal',
                    })),
                };
                return labOrderState;
            });
        jest
            .spyOn(LabPrismaRepository.prototype, 'reviewLabOrder')
            .mockImplementation(async (...args: unknown[]) => {
                const data = args[1] as any;
                labOrderState = {
                    ...labOrderState,
                    reviewedAt: data.reviewedAt,
                    notes: data.notes ?? labOrderState.notes,
                };
                return labOrderState;
            });

        const token = createAccessToken([
            'medical_records:write:all',
            'prescriptions:write:all',
            'lab_orders:create:all',
            'lab_orders:update:all',
            'lab_results:enter:all',
            'lab_results:review:all',
        ]);

        const recordResponse = await request(app)
            .post('/api/medical-records')
            .set('Authorization', `Bearer ${token}`)
            .send({
                patientId,
                appointmentId,
                staffProfileId,
                chiefComplaint: ' Fatigue ',
                diagnosis: ' Stable angina ',
            });

        expect(recordResponse.status).toBe(201);
        expect(recordResponse.body.id).toBe(medicalRecordId);

        const prescriptionResponse = await request(app)
            .post('/api/prescriptions')
            .set('Authorization', `Bearer ${token}`)
            .send({
                medicalRecordId,
                expiresAt: prescription.expiresAt?.toISOString(),
                notes: ' Take after meals ',
                items: [
                    {
                        medicationName: ' Aspirin ',
                        dosage: ' 81 mg ',
                        frequency: ' Once daily ',
                        durationInstructions: '30 days',
                        quantityPrescribed: 30,
                    },
                ],
            });

        expect(prescriptionResponse.status).toBe(201);
        expect(prescriptionResponse.body.pharmacyQueue[0].id).toBe(pharmacyQueueId);

        const labOrderResponse = await request(app)
            .post('/api/lab-orders')
            .set('Authorization', `Bearer ${token}`)
            .send({
                patientId,
                appointmentId,
                medicalRecordId,
                orderedByStaffId: staffProfileId,
                priority: 'urgent',
                notes: ' Draw before medication ',
                tests: [labTestId],
            });

        expect(labOrderResponse.status).toBe(201);
        expect(labOrderResponse.body.id).toBe(labOrderId);

        const collectResponse = await request(app)
            .patch(`/api/lab-orders/${labOrderId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'collected' });

        expect(collectResponse.status).toBe(200);
        expect(collectResponse.body.status).toBe(LabOrderStatus.COLLECTED);

        const progressResponse = await request(app)
            .patch(`/api/lab-orders/${labOrderId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'in_progress' });

        expect(progressResponse.status).toBe(200);
        expect(progressResponse.body.status).toBe(LabOrderStatus.IN_PROGRESS);

        const resultsResponse = await request(app)
            .put(`/api/lab-orders/${labOrderId}/results`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [
                    {
                        itemId: labOrderItemId,
                        resultValue: '12.0',
                        resultUnit: '10^9/L',
                        resultNotes: ' Above reference range ',
                    },
                ],
            });

        expect(resultsResponse.status).toBe(200);
        expect(resultsResponse.body.items[0]).toEqual(
            expect.objectContaining({
                resultValue: '12.0',
                resultStatus: LabResultStatus.ABNORMAL,
                isCritical: false,
            }),
        );

        const completeResponse = await request(app)
            .patch(`/api/lab-orders/${labOrderId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'completed' });

        expect(completeResponse.status).toBe(200);
        expect(completeResponse.body.status).toBe(LabOrderStatus.COMPLETED);

        const reviewResponse = await request(app)
            .post(`/api/lab-orders/${labOrderId}/review`)
            .set('Authorization', `Bearer ${token}`)
            .send({ notes: ' Doctor reviewed abnormal result ' });

        expect(reviewResponse.status).toBe(200);
        expect(reviewResponse.body.reviewedAt).toBeTruthy();
        expect(notificationSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                type: 'lab.results.reviewed',
                title: 'Lab results ready',
            }),
        );
    });

    it('moves billing from partial payment to paid through the payment route', async () => {
        let currentBilling = billingView(BillingStatus.PENDING);

        jest
            .spyOn(BillingPrismaRepository.prototype, 'findBillingById')
            .mockImplementation(async () => currentBilling);
        jest
            .spyOn(BillingPrismaRepository.prototype, 'recordPayment')
            .mockImplementation(async (...args: unknown[]) => {
                const data = args[1] as any;
                currentBilling = billingView(data.newStatus, {
                    amountPaid: data.newAmountPaid,
                    outstandingAmount: currentBilling.totalAmount - data.newAmountPaid,
                    paidAt: data.billingPaidAt ?? null,
                    payments: [
                        ...currentBilling.payments,
                        {
                            id: `payment-${currentBilling.payments.length + 1}`,
                            billingId,
                            amount: data.amount,
                            paymentMethod: data.paymentMethod,
                            referenceNumber: data.referenceNumber,
                            paidAt: data.paidAt,
                            receivedByUserId: data.receivedByUserId ?? null,
                            notes: data.notes ?? null,
                            createdAt,
                            updatedAt: createdAt,
                        },
                    ],
                });
                return currentBilling;
            });

        const token = createAccessToken(['billing:manage:all']);

        const partialResponse = await request(app)
            .post(`/api/billings/${billingId}/payments`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                amount: 30,
                paymentMethod: 'CARD',
                referenceNumber: ' CARD-001 ',
            });

        expect(partialResponse.status).toBe(201);
        expect(partialResponse.body.status).toBe(BillingStatus.PARTIALLY_PAID);
        expect(partialResponse.body.amountPaid).toBe(30);
        expect(partialResponse.body.outstandingAmount).toBe(50);

        const paidResponse = await request(app)
            .post(`/api/billings/${billingId}/payments`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                amount: 50,
                paymentMethod: 'CASH',
                referenceNumber: ' CASH-001 ',
            });

        expect(paidResponse.status).toBe(201);
        expect(paidResponse.body.status).toBe(BillingStatus.PAID);
        expect(paidResponse.body.amountPaid).toBe(80);
        expect(paidResponse.body.outstandingAmount).toBe(0);
        expect(BillingPrismaRepository.prototype.recordPayment).toHaveBeenLastCalledWith(
            billingId,
            expect.objectContaining({
                paymentMethod: PaymentMethod.CASH,
                newAmountPaid: 80,
                newStatus: BillingStatus.PAID,
                billingPaidAt: expect.any(Date),
            }),
        );
    });

    it('notifies patient and doctor when pharmacy marks a medication out of stock', async () => {
        let queueState = pharmacyQueueView(PharmacyStatus.PENDING);
        const notificationSpy = jest
            .spyOn(HttpNotificationClient.prototype, 'send')
            .mockResolvedValue(undefined);

        jest
            .spyOn(PharmacyPrismaRepository.prototype, 'ensureDispensingItems')
            .mockResolvedValue(undefined);
        jest
            .spyOn(PharmacyPrismaRepository.prototype, 'findQueueById')
            .mockImplementation(async () => queueState);
        jest
            .spyOn(PharmacyPrismaRepository.prototype, 'startQueue')
            .mockImplementation(async () => {
                queueState = pharmacyQueueView(PharmacyStatus.IN_PROGRESS);
                return queueState;
            });
        jest
            .spyOn(PharmacyPrismaRepository.prototype, 'dispenseQueue')
            .mockImplementation(async (...args: unknown[]) => {
                const data = args[1] as any;
                queueState = pharmacyQueueView(PharmacyStatus.OUT_OF_STOCK, {
                    dispensingItems: queueState.dispensingItems.map((item) => ({
                        ...item,
                        inventoryItemId,
                        quantityDispensed: 0,
                        status: PharmacyStatus.OUT_OF_STOCK,
                        notes: data.items[0].notes ?? null,
                    })),
                });

                return {
                    queue: queueState,
                    outOfStockItems: [
                        {
                            prescriptionItemId,
                            medicationName: 'Aspirin',
                            dosage: '81 mg',
                            quantityRequested: 30,
                        },
                    ],
                };
            });

        const token = createAccessToken(
            ['pharmacy:dispense:all'],
            pharmacistUserId,
            ['Pharmacist'],
        );

        const startResponse = await request(app)
            .patch(`/api/pharmacy/queue/${pharmacyQueueId}/start`)
            .set('Authorization', `Bearer ${token}`);

        expect(startResponse.status).toBe(200);
        expect(startResponse.body.status).toBe(PharmacyStatus.IN_PROGRESS);

        const dispenseResponse = await request(app)
            .post(`/api/pharmacy/queue/${pharmacyQueueId}/dispense`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [
                    {
                        prescriptionItemId,
                        status: 'out_of_stock',
                        notes: ' Reorder requested ',
                    },
                ],
            });

        expect(dispenseResponse.status).toBe(200);
        expect(dispenseResponse.body.status).toBe(PharmacyStatus.OUT_OF_STOCK);
        expect(notificationSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: patientUserId,
                type: 'pharmacy.medication.out_of_stock',
            }),
        );
        expect(notificationSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: doctorUserId,
                type: 'pharmacy.medication.out_of_stock',
            }),
        );
    });
});
