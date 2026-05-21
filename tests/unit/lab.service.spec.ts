import {
    AppointmentStatus,
    LabOrderStatus,
    LabResultStatus,
} from '../../src/generated/prisma';
import { LabEventPublisher } from '../../src/modules/lab/domain/lab-event.publisher';
import { LabOrderView, LabTestEntity } from '../../src/modules/lab/domain/lab.entity';
import { LabRepository } from '../../src/modules/lab/domain/lab.repository';
import { LabService } from '../../src/modules/lab/services/lab.service';

const patientId = '35974dde-783f-43a1-bcab-117d754f81e1';
const patientUserId = '9dbd7a27-0b3c-4939-8a2f-1f20fd1ef6ee';
const departmentId = '8d1dbd2c-b5c4-4d8f-b75b-e8a2dce8f30e';
const staffProfileId = '42b2c8e0-4df7-4df1-b951-fb96b0b8cf86';
const appointmentId = 'e61720ab-6446-4da3-a4bc-f642940e4a81';
const medicalRecordId = '2fb8b77f-0a57-4c85-89f7-9222da1fcb12';
const labOrderId = '0f79fa2f-2db3-4819-9c81-f0e51daeed51';
const actorUserId = '7cded68b-2455-4104-87ea-cc3b78d2aa6f';

const labTestA: LabTestEntity = {
    id: 'c16d8e7d-df2c-430a-a735-9b69dbed0747',
    code: 'GLU',
    name: 'Glucose',
    description: 'Serum glucose',
    category: 'Chemistry',
    sampleType: 'Blood',
    defaultPrice: '15.00',
    referenceRange: '70-99 mg/dL',
    isActive: true,
    createdAt: new Date('2026-05-21T08:00:00.000Z'),
    updatedAt: new Date('2026-05-21T08:00:00.000Z'),
};

const labTestB: LabTestEntity = {
    ...labTestA,
    id: 'a4e0820f-506d-447e-9bb0-bf5a9f44b644',
    code: 'ALT',
    name: 'Alanine Aminotransferase',
    referenceRange: '7-55 U/L',
};

const appointment = {
    id: appointmentId,
    patientId,
    staffProfileId,
    departmentId,
    status: AppointmentStatus.IN_PROGRESS,
    scheduledAt: new Date('2030-01-02T09:00:00.000Z'),
    endAt: new Date('2030-01-02T09:30:00.000Z'),
};

const medicalRecord = {
    id: medicalRecordId,
    patientId,
    appointmentId,
    staffProfileId,
    departmentId,
    diagnosis: 'Diabetes screening',
    isFinalized: false,
    createdAt: new Date('2026-05-21T08:00:00.000Z'),
};

const order: LabOrderView = {
    id: labOrderId,
    patientId,
    appointmentId,
    medicalRecordId,
    orderedByStaffId: staffProfileId,
    departmentId,
    status: LabOrderStatus.PENDING,
    priority: 'urgent',
    notes: 'Fasting sample',
    orderedAt: new Date('2026-05-21T08:10:00.000Z'),
    collectedAt: null,
    completedAt: null,
    reviewedAt: null,
    createdAt: new Date('2026-05-21T08:10:00.000Z'),
    updatedAt: new Date('2026-05-21T08:10:00.000Z'),
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
        status: AppointmentStatus.IN_PROGRESS,
        scheduledAt: appointment.scheduledAt,
        endAt: appointment.endAt,
    },
    medicalRecord: {
        id: medicalRecordId,
        diagnosis: 'Diabetes screening',
        isFinalized: false,
        createdAt: medicalRecord.createdAt,
    },
    orderedByStaff: {
        id: staffProfileId,
        userId: actorUserId,
        employeeCode: 'DR-001',
        specialization: 'Cardiologist',
        displayName: 'DR-001 - Cardiologist',
    },
    department: {
        id: departmentId,
        name: 'Cardiology',
        isActive: true,
    },
    items: [
        {
            id: '22c52439-b31f-4de8-9b0e-80dd54e47561',
            labTestId: labTestA.id,
            resultValue: null,
            resultUnit: null,
            resultNotes: null,
            resultStatus: LabResultStatus.PENDING,
            isCritical: false,
            completedAt: null,
            flag: 'pending',
            labTest: {
                id: labTestA.id,
                code: labTestA.code,
                name: labTestA.name,
                description: labTestA.description,
                category: labTestA.category,
                sampleType: labTestA.sampleType,
                defaultPrice: labTestA.defaultPrice,
                referenceRange: labTestA.referenceRange,
                isActive: labTestA.isActive,
            },
        },
        {
            id: '41efc405-43a8-4212-a744-90cb75b22ab0',
            labTestId: labTestB.id,
            resultValue: null,
            resultUnit: null,
            resultNotes: null,
            resultStatus: LabResultStatus.PENDING,
            isCritical: false,
            completedAt: null,
            flag: 'pending',
            labTest: {
                id: labTestB.id,
                code: labTestB.code,
                name: labTestB.name,
                description: labTestB.description,
                category: labTestB.category,
                sampleType: labTestB.sampleType,
                defaultPrice: labTestB.defaultPrice,
                referenceRange: labTestB.referenceRange,
                isActive: labTestB.isActive,
            },
        },
    ],
};

function createRepositoryMock(): jest.Mocked<LabRepository> {
    return {
        createLabTest: jest.fn(),
        findLabTestById: jest.fn(),
        findLabTestByCode: jest.fn(),
        findLabTestsByIds: jest.fn(),
        listLabTests: jest.fn(),
        updateLabTest: jest.fn(),
        deactivateLabTest: jest.fn(),
        findPatientById: jest.fn(),
        findPatientByUserId: jest.fn(),
        findAppointmentById: jest.fn(),
        findMedicalRecordById: jest.fn(),
        createLabOrder: jest.fn(),
        findLabOrderById: jest.fn(),
        listLabOrders: jest.fn(),
        listPendingLabOrders: jest.fn(),
        updateLabOrderStatus: jest.fn(),
        enterLabOrderResults: jest.fn(),
        reviewLabOrder: jest.fn(),
    };
}

function createEventPublisherMock(): jest.Mocked<LabEventPublisher> {
    return {
        publish: jest.fn(),
    };
}

describe('LabService', () => {
    it('creates a lab order from consultation context', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        repository.findAppointmentById.mockResolvedValue(appointment);
        repository.findMedicalRecordById.mockResolvedValue(medicalRecord);
        repository.findLabTestsByIds.mockResolvedValue([labTestA, labTestB]);
        repository.createLabOrder.mockResolvedValue(order);
        const service = new LabService(repository, eventPublisher);

        const result = await service.createLabOrder({
            patientId,
            appointmentId,
            medicalRecordId,
            orderedByStaffId: staffProfileId,
            priority: ' urgent ',
            notes: ' Fasting   sample ',
            tests: [labTestA.id, labTestB.id],
            actorUserId,
        });

        expect(result.id).toBe(labOrderId);
        expect(repository.createLabOrder).toHaveBeenCalledWith(
            expect.objectContaining({
                patientId,
                appointmentId,
                medicalRecordId,
                orderedByStaffId: staffProfileId,
                departmentId,
                priority: 'urgent',
                notes: 'Fasting sample',
                items: [{ labTestId: labTestA.id }, { labTestId: labTestB.id }],
            }),
        );
        expect(eventPublisher.publish).toHaveBeenCalledWith(
            'LabOrderCreated',
            expect.objectContaining({ order, actorUserId }),
        );
    });

    it('auto-flags abnormal and critical results on entry', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        repository.findLabOrderById.mockResolvedValue(order);
        repository.enterLabOrderResults.mockResolvedValue({
            ...order,
            items: [
                {
                    ...order.items[0],
                    resultValue: '120',
                    resultUnit: 'mg/dL',
                    resultStatus: LabResultStatus.ABNORMAL,
                    flag: 'abnormal',
                },
                {
                    ...order.items[1],
                    resultValue: '400',
                    resultUnit: 'U/L',
                    resultStatus: LabResultStatus.CRITICAL,
                    isCritical: true,
                    flag: 'critical',
                },
            ],
        });
        const service = new LabService(repository, eventPublisher);

        await service.enterLabOrderResults(labOrderId, {
            items: [
                {
                    itemId: order.items[0].id,
                    resultValue: '120',
                    resultUnit: 'mg/dL',
                },
                {
                    itemId: order.items[1].id,
                    resultValue: '400',
                    resultUnit: 'U/L',
                },
            ],
            actorUserId,
        });

        expect(repository.enterLabOrderResults).toHaveBeenCalledWith(
            labOrderId,
            expect.objectContaining({
                items: expect.arrayContaining([
                    expect.objectContaining({
                        itemId: order.items[0].id,
                        resultStatus: LabResultStatus.ABNORMAL,
                        isCritical: false,
                    }),
                    expect.objectContaining({
                        itemId: order.items[1].id,
                        resultStatus: LabResultStatus.CRITICAL,
                        isCritical: true,
                    }),
                ]),
            }),
        );
    });

    it('blocks completion until every ordered test has a result', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        repository.findLabOrderById.mockResolvedValue({
            ...order,
            status: LabOrderStatus.IN_PROGRESS,
        });
        const service = new LabService(repository, eventPublisher);

        await expect(
            service.updateLabOrderStatus(
                labOrderId,
                LabOrderStatus.COMPLETED,
                actorUserId,
            ),
        ).rejects.toMatchObject({
            message: 'All lab order items must have results before completion',
            statusCode: 409,
        });
        expect(repository.updateLabOrderStatus).not.toHaveBeenCalled();
    });

    it('reviews a completed order and publishes a review event', async () => {
        const repository = createRepositoryMock();
        const eventPublisher = createEventPublisherMock();
        const reviewedAt = new Date('2026-05-21T11:00:00.000Z');
        const completedOrder = {
            ...order,
            status: LabOrderStatus.COMPLETED,
            completedAt: new Date('2026-05-21T10:30:00.000Z'),
            items: order.items.map((item, index) => ({
                ...item,
                resultValue: index === 0 ? '95' : '25',
                resultUnit: index === 0 ? 'mg/dL' : 'U/L',
                resultStatus: LabResultStatus.ENTERED,
                flag: 'normal' as const,
                completedAt: new Date('2026-05-21T10:00:00.000Z'),
            })),
        };
        repository.findLabOrderById.mockResolvedValue(completedOrder);
        repository.reviewLabOrder.mockResolvedValue({
            ...completedOrder,
            reviewedAt,
        });
        const service = new LabService(repository, eventPublisher, () => reviewedAt);

        const result = await service.reviewLabOrder(labOrderId, {
            notes: 'Reviewed by doctor',
            actorUserId,
        });

        expect(result.reviewedAt).toEqual(reviewedAt);
        expect(repository.reviewLabOrder).toHaveBeenCalledWith(
            labOrderId,
            expect.objectContaining({
                reviewedAt,
                notes: 'Reviewed by doctor',
            }),
        );
        expect(eventPublisher.publish).toHaveBeenCalledWith(
            'LabOrderReviewed',
            expect.objectContaining({
                order: expect.objectContaining({ id: labOrderId, reviewedAt }),
                actorUserId,
            }),
        );
    });
});
