import { LabOrderStatus } from '../../../generated/prisma';
import { AppError } from '../../../shared/core/errors/app-error';
import {
    AiLabResultFlag,
    LabAiClient,
    LabAiInterpretationRequest,
    LabAiPatientContext,
    NoopLabAiClient,
} from '../domain/lab-ai.client';
import {
    evaluateLabResult,
    parseReferenceRange,
} from '../domain/lab-result-evaluator';
import {
    normalizeLabCode,
    normalizeOptionalText,
    normalizePriority,
    normalizeRequiredText,
} from '../domain/lab.normalizer';
import { LabEventPublisher } from '../domain/lab-event.publisher';
import {
    CreateLabOrderData,
    LabRepository,
    ListLabOrdersFilters,
    ListLabTestsFilters,
    UpdateLabTestData,
} from '../domain/lab.repository';

const LAB_ORDER_STATUS_TRANSITIONS: Record<LabOrderStatus, LabOrderStatus[]> = {
    [LabOrderStatus.PENDING]: [
        LabOrderStatus.COLLECTED,
        LabOrderStatus.CANCELLED,
    ],
    [LabOrderStatus.COLLECTED]: [
        LabOrderStatus.IN_PROGRESS,
        LabOrderStatus.CANCELLED,
    ],
    [LabOrderStatus.IN_PROGRESS]: [
        LabOrderStatus.COMPLETED,
        LabOrderStatus.CANCELLED,
    ],
    [LabOrderStatus.COMPLETED]: [],
    [LabOrderStatus.CANCELLED]: [],
};

function hasDuplicates(values: string[]) {
    return new Set(values).size !== values.length;
}

function parseResultNumber(value: string) {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    const parsed = match ? Number(match[0]) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : null;
}

function isPresent<T>(value: T | null | undefined): value is T {
    return value !== undefined && value !== null;
}

type ExistingLabOrder = NonNullable<
    Awaited<ReturnType<LabRepository['findLabOrderById']>>
>;

export class LabService {
    constructor(
        private readonly labRepository: LabRepository,
        private readonly eventPublisher: LabEventPublisher,
        private readonly nowProvider: () => Date = () => new Date(),
        private readonly aiClient: LabAiClient = new NoopLabAiClient(),
    ) {}

    async createLabTest(data: {
        code: string;
        name: string;
        description?: string | null;
        category?: string | null;
        sampleType?: string | null;
        defaultPrice?: number | null;
        referenceRange?: string | null;
        isActive?: boolean;
        actorUserId?: string;
    }) {
        const code = normalizeLabCode(data.code);
        const existing = await this.labRepository.findLabTestByCode(code);

        if (existing) {
            throw new AppError('Lab test code already exists', 409);
        }

        return this.labRepository.createLabTest({
            code,
            name: normalizeRequiredText(data.name, 'Name'),
            description: normalizeOptionalText(data.description),
            category: normalizeOptionalText(data.category),
            sampleType: normalizeOptionalText(data.sampleType),
            defaultPrice: data.defaultPrice ?? null,
            referenceRange: normalizeOptionalText(data.referenceRange),
            isActive: data.isActive ?? true,
            actorUserId: data.actorUserId,
        });
    }

    async listLabTests(filters: ListLabTestsFilters) {
        return this.labRepository.listLabTests(filters);
    }

    async getLabTestById(id: string) {
        const labTest = await this.labRepository.findLabTestById(id);

        if (!labTest) {
            throw new AppError('Lab test not found', 404);
        }

        return labTest;
    }

    async updateLabTest(id: string, data: UpdateLabTestData) {
        const existing = await this.getLabTestById(id);
        const updateData: UpdateLabTestData = {
            actorUserId: data.actorUserId,
        };

        if (data.code !== undefined) {
            const code = normalizeLabCode(data.code);

            if (code !== existing.code) {
                const duplicate = await this.labRepository.findLabTestByCode(code);

                if (duplicate && duplicate.id !== id) {
                    throw new AppError('Lab test code already exists', 409);
                }
            }

            updateData.code = code;
        }

        if (data.name !== undefined) {
            updateData.name = normalizeRequiredText(data.name, 'Name');
        }

        if (data.description !== undefined) {
            updateData.description = normalizeOptionalText(data.description);
        }

        if (data.category !== undefined) {
            updateData.category = normalizeOptionalText(data.category);
        }

        if (data.sampleType !== undefined) {
            updateData.sampleType = normalizeOptionalText(data.sampleType);
        }

        if (data.defaultPrice !== undefined) {
            updateData.defaultPrice = data.defaultPrice;
        }

        if (data.referenceRange !== undefined) {
            updateData.referenceRange = normalizeOptionalText(data.referenceRange);
        }

        if (data.isActive !== undefined) {
            updateData.isActive = data.isActive;
        }

        if (Object.keys(updateData).length === 1) {
            throw new AppError('At least one lab test field is required', 400);
        }

        return this.labRepository.updateLabTest(id, updateData);
    }

    async deactivateLabTest(id: string, actorUserId?: string) {
        const existing = await this.getLabTestById(id);

        if (!existing.isActive) {
            return existing;
        }

        return this.labRepository.deactivateLabTest(id, actorUserId);
    }

    async createLabOrder(data: {
        patientId: string;
        appointmentId: string;
        medicalRecordId?: string | null;
        orderedByStaffId: string;
        priority?: string | null;
        notes?: string | null;
        tests: string[];
        actorUserId?: string;
    }) {
        if (!data.tests.length) {
            throw new AppError('At least one lab test is required', 400);
        }

        if (hasDuplicates(data.tests)) {
            throw new AppError('Duplicate lab tests are not allowed in one order', 400);
        }

        const appointment = await this.labRepository.findAppointmentById(
            data.appointmentId,
        );

        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }

        if (appointment.patientId !== data.patientId) {
            throw new AppError('Appointment does not belong to this patient', 400);
        }

        if (!appointment.staffProfileId) {
            throw new AppError('Appointment must have an assigned staff profile', 400);
        }

        if (appointment.staffProfileId !== data.orderedByStaffId) {
            throw new AppError('Appointment is assigned to a different staff profile', 400);
        }

        const medicalRecordId = data.medicalRecordId ?? null;

        if (medicalRecordId) {
            const medicalRecord = await this.labRepository.findMedicalRecordById(
                medicalRecordId,
            );

            if (!medicalRecord) {
                throw new AppError('Medical record not found', 404);
            }

            if (medicalRecord.patientId !== data.patientId) {
                throw new AppError('Medical record does not belong to this patient', 400);
            }

            if (medicalRecord.appointmentId !== data.appointmentId) {
                throw new AppError(
                    'Medical record does not belong to this appointment',
                    400,
                );
            }

            if (medicalRecord.staffProfileId !== data.orderedByStaffId) {
                throw new AppError(
                    'Medical record is assigned to a different staff profile',
                    400,
                );
            }
        }

        const labTests = await this.labRepository.findLabTestsByIds(data.tests);

        if (labTests.length !== data.tests.length) {
            throw new AppError('One or more lab tests were not found', 404);
        }

        const inactiveTest = labTests.find((labTest) => !labTest.isActive);

        if (inactiveTest) {
            throw new AppError(
                `Lab test ${inactiveTest.code} is inactive and cannot be ordered`,
                409,
            );
        }

        const order = await this.labRepository.createLabOrder({
            patientId: data.patientId,
            appointmentId: data.appointmentId,
            medicalRecordId,
            orderedByStaffId: data.orderedByStaffId,
            departmentId: appointment.departmentId,
            priority: normalizePriority(data.priority) ?? 'normal',
            notes: normalizeOptionalText(data.notes),
            items: data.tests.map((labTestId) => ({ labTestId })),
            actorUserId: data.actorUserId,
        });

        await this.publishSafely('LabOrderCreated', {
            order,
            actorUserId: data.actorUserId,
        });

        return order;
    }

    async listLabOrders(
        filters: ListLabOrdersFilters,
        actorUserId?: string,
        canReadAll = false,
    ) {
        if (filters.from && filters.to && filters.from > filters.to) {
            throw new AppError('from must be before or equal to to', 400);
        }

        const patientId = await this.resolveReadablePatientId(
            filters.patientId,
            actorUserId,
            canReadAll,
        );

        return this.labRepository.listLabOrders({
            ...filters,
            patientId,
        });
    }

    async listPendingLabOrders() {
        return this.labRepository.listPendingLabOrders();
    }

    async getLabOrderById(id: string, actorUserId?: string, canReadAll = false) {
        const order = await this.getExistingLabOrder(id);
        this.ensureCanRead(order.patient.userId, actorUserId, canReadAll);
        return order;
    }

    async updateLabOrderStatus(
        id: string,
        status: LabOrderStatus,
        actorUserId?: string,
    ) {
        const order = await this.getExistingLabOrder(id);

        if (order.status === status) {
            return order;
        }

        const allowedTransitions = LAB_ORDER_STATUS_TRANSITIONS[order.status];

        if (!allowedTransitions.includes(status)) {
            throw new AppError(
                `Cannot move lab order from ${order.status} to ${status}`,
                409,
            );
        }

        if (
            status === LabOrderStatus.COMPLETED &&
            order.items.some((item) => !item.resultValue)
        ) {
            throw new AppError(
                'All lab order items must have results before completion',
                409,
            );
        }

        const now = this.nowProvider();
        const updatedOrder = await this.labRepository.updateLabOrderStatus(id, {
            status,
            collectedAt:
                status === LabOrderStatus.COLLECTED
                    ? order.collectedAt ?? now
                    : undefined,
            completedAt:
                status === LabOrderStatus.COMPLETED
                    ? order.completedAt ?? now
                    : undefined,
            actorUserId,
        });

        if (status === LabOrderStatus.COMPLETED) {
            await this.publishSafely('LabOrderCompleted', {
                order: updatedOrder,
                actorUserId,
            });
            await this.triggerAiSafely(updatedOrder);
        }

        return updatedOrder;
    }

    async enterLabOrderResults(
        id: string,
        data: {
            items: Array<{
                itemId: string;
                resultValue: string;
                resultUnit?: string | null;
                resultNotes?: string | null;
            }>;
            actorUserId?: string;
        },
    ) {
        const order = await this.getExistingLabOrder(id);

        if (order.status === LabOrderStatus.CANCELLED) {
            throw new AppError('Cancelled lab orders cannot accept results', 409);
        }

        if (order.reviewedAt) {
            throw new AppError('Reviewed lab orders cannot be edited', 409);
        }

        if (!data.items.length) {
            throw new AppError('At least one result item is required', 400);
        }

        const itemIds = data.items.map((item) => item.itemId);

        if (hasDuplicates(itemIds)) {
            throw new AppError('Duplicate lab order items are not allowed', 400);
        }

        const existingItems = new Map(order.items.map((item) => [item.id, item]));

        const updates = data.items.map((item) => {
            const existingItem = existingItems.get(item.itemId);

            if (!existingItem) {
                throw new AppError('Lab order item not found', 404);
            }

            const resultValue = normalizeRequiredText(item.resultValue, 'Result value');
            const evaluation = evaluateLabResult({
                resultValue,
                referenceRange: existingItem.labTest.referenceRange,
            });

            return {
                itemId: item.itemId,
                resultValue,
                resultUnit: normalizeOptionalText(item.resultUnit),
                resultNotes: normalizeOptionalText(item.resultNotes),
                resultStatus: evaluation.resultStatus,
                isCritical: evaluation.isCritical,
                completedAt: this.nowProvider(),
            };
        });

        const updatedOrder = await this.labRepository.enterLabOrderResults(id, {
            items: updates,
            actorUserId: data.actorUserId,
        });

        if (this.isCompletedWithResults(updatedOrder)) {
            await this.triggerAiSafely(updatedOrder);
        }

        return updatedOrder;
    }

    async reviewLabOrder(
        id: string,
        data: {
            notes?: string | null;
            actorUserId?: string;
        },
    ) {
        const order = await this.getExistingLabOrder(id);

        if (order.status !== LabOrderStatus.COMPLETED) {
            throw new AppError('Only completed lab orders can be reviewed', 409);
        }

        if (order.items.some((item) => !item.resultValue)) {
            throw new AppError('All lab order items must have results before review', 409);
        }

        if (order.reviewedAt) {
            return order;
        }

        const updatedOrder = await this.labRepository.reviewLabOrder(id, {
            reviewedAt: this.nowProvider(),
            notes: normalizeOptionalText(data.notes),
            actorUserId: data.actorUserId,
        });

        await this.publishSafely('LabOrderReviewed', {
            order: updatedOrder,
            actorUserId: data.actorUserId,
        });

        return updatedOrder;
    }

    async triggerAi(id: string) {
        const order = await this.getExistingLabOrder(id);

        this.ensureReadyForAi(order);

        return this.queueAiInterpretation(order);
    }

    private isCompletedWithResults(order: ExistingLabOrder | null) {
        return (
            !!order &&
            order.status === LabOrderStatus.COMPLETED &&
            order.items.length > 0 &&
            order.items.every((item) => !!item.resultValue)
        );
    }

    private ensureReadyForAi(order: ExistingLabOrder) {
        if (order.status !== LabOrderStatus.COMPLETED) {
            throw new AppError(
                'Only completed lab orders can be sent for AI interpretation',
                409,
            );
        }

        if (!order.items.length || order.items.some((item) => !item.resultValue)) {
            throw new AppError(
                'All lab order items must have results before AI interpretation',
                409,
            );
        }
    }

    private async triggerAiSafely(order: ExistingLabOrder) {
        try {
            this.ensureReadyForAi(order);
            await this.queueAiInterpretation(order);
        } catch {
            // Lab completion should not fail because background AI generation failed.
        }
    }

    private async queueAiInterpretation(order: ExistingLabOrder) {
        try {
            return await this.aiClient.queueLabInterpretation(
                order.id,
                this.buildAiInterpretationPayload(order),
            );
        } catch {
            throw new AppError('AI interpretation service is unavailable', 502);
        }
    }

    private buildAiInterpretationPayload(order: ExistingLabOrder): LabAiInterpretationRequest {
        const patientContext = this.buildPatientContext(order);

        return {
            patientId: order.patientId,
            results: order.items
                .filter((item) => item.resultValue)
                .map((item) => {
                    const numericValue = parseResultNumber(item.resultValue as string);

                    return {
                        name: item.labTest.name,
                        value: numericValue ?? (item.resultValue as string),
                        unit: item.resultUnit ?? undefined,
                        referenceRange: item.labTest.referenceRange ?? undefined,
                        flag: this.toAiResultFlag(item),
                    };
                }),
            patientContext,
        };
    }

    private buildPatientContext(order: ExistingLabOrder): LabAiPatientContext | undefined {
        const age = order.patient.dateOfBirth
            ? this.calculateAge(order.patient.dateOfBirth)
            : undefined;
        const knownConditions = [order.medicalRecord?.diagnosis]
            .filter(isPresent)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
        const context: LabAiPatientContext = {
            age,
            gender: order.patient.gender ?? undefined,
            knownConditions: knownConditions.length ? knownConditions : undefined,
        };

        return Object.values(context).some((value) => value !== undefined)
            ? context
            : undefined;
    }

    private calculateAge(dateOfBirth: Date) {
        const today = this.nowProvider();
        let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();
        const birthdayHasPassed =
            today.getUTCMonth() > dateOfBirth.getUTCMonth() ||
            (today.getUTCMonth() === dateOfBirth.getUTCMonth() &&
                today.getUTCDate() >= dateOfBirth.getUTCDate());

        if (!birthdayHasPassed) {
            age -= 1;
        }

        return age > 0 ? age : undefined;
    }

    private toAiResultFlag(
        orderItem: ExistingLabOrder['items'][number],
    ): AiLabResultFlag | undefined {
        if (orderItem.flag === 'critical') {
            return 'critical';
        }

        if (orderItem.flag === 'normal') {
            return 'normal';
        }

        if (orderItem.flag !== 'abnormal' || !orderItem.resultValue) {
            return undefined;
        }

        const numericValue = parseResultNumber(orderItem.resultValue);
        const range = parseReferenceRange(orderItem.labTest.referenceRange);

        if (numericValue === null || !range) {
            return undefined;
        }

        return numericValue < range.min ? 'low' : 'high';
    }

    private async getExistingLabOrder(id: string) {
        const order = await this.labRepository.findLabOrderById(id);

        if (!order) {
            throw new AppError('Lab order not found', 404);
        }

        return order;
    }

    private async resolveReadablePatientId(
        patientId: string | undefined,
        actorUserId: string | undefined,
        canReadAll: boolean,
    ) {
        if (canReadAll) {
            return patientId;
        }

        if (!actorUserId) {
            throw new AppError('Forbidden', 403);
        }

        if (patientId) {
            const patient = await this.labRepository.findPatientById(patientId);

            if (!patient) {
                throw new AppError('Patient not found', 404);
            }

            if (patient.userId !== actorUserId) {
                throw new AppError('Forbidden', 403);
            }

            return patientId;
        }

        const patient = await this.labRepository.findPatientByUserId(actorUserId);
        return patient?.id ?? 'no-readable-patient';
    }

    private ensureCanRead(
        patientUserId: string | null,
        actorUserId: string | undefined,
        canReadAll: boolean,
    ) {
        if (canReadAll) {
            return;
        }

        if (patientUserId && patientUserId === actorUserId) {
            return;
        }

        throw new AppError('Forbidden', 403);
    }

    private async publishSafely(
        type: Parameters<LabEventPublisher['publish']>[0],
        payload: Parameters<LabEventPublisher['publish']>[1],
    ) {
        try {
            await this.eventPublisher.publish(type, payload);
        } catch {
            // Notification delivery should not fail the primary workflow.
        }
    }
}
