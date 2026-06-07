import { BloodType, EmploymentStatus, Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import { HttpAuthUserProfilesClient } from '../../../shared/auth/auth-user-profiles.client';
import { decryptPersonalNumber } from '../../patients/domain/patient.crypto';
import { deriveStaffUserFallback } from '../../staff/domain/staff-user-fallback';
import {
    DataExchangeRow,
    DepartmentReference,
    ExportEntity,
    InventoryCategoryReference,
    InventoryItemImportData,
    LabTestImportData,
    PatientExistingKeys,
    PatientImportData,
    ServiceCatalogImportData,
    StaffExistingKeys,
    StaffImportData,
    StaffPositionTypeReference,
} from '../domain/data-exchange.entity';
import { DataExchangeRepository } from '../domain/data-exchange.repository';

type DatabaseClient = Prisma.TransactionClient;

function unique(values: string[]) {
    return Array.from(new Set(values.filter(Boolean)));
}

function lower(value: string) {
    return value.trim().toLowerCase();
}

function serviceKey(departmentId: string, name: string) {
    return `${departmentId}:${lower(name)}`;
}

function textSearch(names: string[]) {
    return unique(names).map((name) => ({
        name: {
            equals: name,
            mode: 'insensitive' as const,
        },
    }));
}

function emailSearch(emails: string[]) {
    return unique(emails).map((email) => ({
        email: {
            equals: email,
            mode: 'insensitive' as const,
        },
    }));
}

function toJsonInput(value: unknown) {
    if (value === undefined) {
        return undefined;
    }

    return value as Prisma.InputJsonValue;
}

export class DataExchangePrismaRepository implements DataExchangeRepository {
    private readonly authUserProfilesClient = new HttpAuthUserProfilesClient();

    async exportRows(entity: ExportEntity): Promise<DataExchangeRow[]> {
        if (entity === 'patients') {
            return this.exportPatients();
        }

        if (entity === 'appointments') {
            return this.exportAppointments();
        }

        if (entity === 'lab-results') {
            return this.exportLabResults();
        }

        if (entity === 'inventory-items') {
            return this.exportInventoryItems();
        }

        if (entity === 'billings') {
            return this.exportBillings();
        }

        if (entity === 'staff') {
            return this.exportStaff();
        }

        return this.exportAuditLogs();
    }

    async findExistingPatientKeys(
        emails: string[],
        personalNumberHashes: string[],
        userIds: string[],
    ): Promise<PatientExistingKeys> {
        const [emailMatches, hashMatches, userMatches] = await prisma.$transaction([
            emailSearch(emails).length
                ? prisma.patient.findMany({
                      where: { OR: emailSearch(emails) },
                      select: { email: true },
                  })
                : prisma.patient.findMany({ where: { id: { in: [] } } }),
            personalNumberHashes.length
                ? prisma.patient.findMany({
                      where: {
                          personalNumberHash: {
                              in: unique(personalNumberHashes),
                          },
                      },
                      select: { personalNumberHash: true },
                  })
                : prisma.patient.findMany({ where: { id: { in: [] } } }),
            userIds.length
                ? prisma.patient.findMany({
                      where: { userId: { in: unique(userIds) } },
                      select: { userId: true },
                  })
                : prisma.patient.findMany({ where: { id: { in: [] } } }),
        ]);

        return {
            emails: new Set(
                emailMatches
                    .map((patient) => patient.email)
                    .filter((email): email is string => Boolean(email))
                    .map(lower),
            ),
            personalNumberHashes: new Set(
                hashMatches
                    .map((patient) => patient.personalNumberHash)
                    .filter((hash): hash is string => Boolean(hash)),
            ),
            userIds: new Set(
                userMatches
                    .map((patient) => patient.userId)
                    .filter((userId): userId is string => Boolean(userId)),
            ),
        };
    }

    async findExistingLabTestCodes(codes: string[]) {
        const tests = await prisma.labTest.findMany({
            where: { code: { in: unique(codes) } },
            select: { code: true },
        });

        return new Set(tests.map((test) => test.code));
    }

    async findExistingInventorySkus(skus: string[]) {
        const items = await prisma.inventoryItem.findMany({
            where: { sku: { in: unique(skus) } },
            select: { sku: true },
        });

        return new Set(items.map((item) => item.sku));
    }

    async findExistingServiceCatalogKeys(departmentIds: string[], names: string[]) {
        const nameFilters = textSearch(names);

        if (!departmentIds.length || !nameFilters.length) {
            return new Set<string>();
        }

        const services = await prisma.serviceCatalog.findMany({
            where: {
                departmentId: { in: unique(departmentIds) },
                OR: nameFilters,
            },
            select: {
                departmentId: true,
                name: true,
            },
        });

        return new Set(
            services.map((service) =>
                serviceKey(service.departmentId, service.name),
            ),
        );
    }

    async findExistingStaffKeys(
        userIds: string[],
        employeeCodes: string[],
    ): Promise<StaffExistingKeys> {
        const [userMatches, codeMatches] = await prisma.$transaction([
            userIds.length
                ? prisma.staffProfile.findMany({
                      where: { userId: { in: unique(userIds) } },
                      select: { userId: true },
                  })
                : prisma.staffProfile.findMany({ where: { id: { in: [] } } }),
            employeeCodes.length
                ? prisma.staffProfile.findMany({
                      where: { employeeCode: { in: unique(employeeCodes) } },
                      select: { employeeCode: true },
                  })
                : prisma.staffProfile.findMany({ where: { id: { in: [] } } }),
        ]);

        return {
            userIds: new Set(userMatches.map((staff) => staff.userId)),
            employeeCodes: new Set(codeMatches.map((staff) => staff.employeeCode)),
        };
    }

    async findDepartmentsByIds(ids: string[]): Promise<DepartmentReference[]> {
        if (!ids.length) {
            return [];
        }

        return prisma.department.findMany({
            where: { id: { in: unique(ids) } },
            select: { id: true, name: true, isActive: true },
        });
    }

    async findDepartmentsByNames(names: string[]): Promise<DepartmentReference[]> {
        const filters = textSearch(names);

        if (!filters.length) {
            return [];
        }

        return prisma.department.findMany({
            where: { OR: filters },
            select: { id: true, name: true, isActive: true },
        });
    }

    async findInventoryCategoriesByIds(
        ids: string[],
    ): Promise<InventoryCategoryReference[]> {
        if (!ids.length) {
            return [];
        }

        return prisma.inventoryCategory.findMany({
            where: { id: { in: unique(ids) } },
            select: { id: true, name: true, isActive: true },
        });
    }

    async findInventoryCategoriesByNames(
        names: string[],
    ): Promise<InventoryCategoryReference[]> {
        const filters = textSearch(names);

        if (!filters.length) {
            return [];
        }

        return prisma.inventoryCategory.findMany({
            where: { OR: filters },
            select: { id: true, name: true, isActive: true },
        });
    }

    async findStaffPositionTypesByIds(
        ids: string[],
    ): Promise<StaffPositionTypeReference[]> {
        if (!ids.length) {
            return [];
        }

        return prisma.staffPositionType.findMany({
            where: { id: { in: unique(ids) } },
            select: { id: true, name: true, isActive: true },
        });
    }

    async findStaffPositionTypesByNames(
        names: string[],
    ): Promise<StaffPositionTypeReference[]> {
        const filters = textSearch(names);

        if (!filters.length) {
            return [];
        }

        return prisma.staffPositionType.findMany({
            where: { OR: filters },
            select: { id: true, name: true, isActive: true },
        });
    }

    async importPatients(
        rows: PatientImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ) {
        return this.write(strict, async (client) => {
            for (const row of rows) {
                await client.patient.create({
                    data: {
                        userId: row.userId ?? null,
                        firstName: row.firstName,
                        lastName: row.lastName,
                        email: row.email ?? null,
                        phone: row.phone ?? null,
                        dateOfBirth: row.dateOfBirth ?? null,
                        gender: row.gender ?? null,
                        bloodType: row.bloodType ? (row.bloodType as BloodType) : null,
                        personalNumber: row.personalNumber ?? null,
                        personalNumberHash: row.personalNumberHash ?? null,
                        address: row.address ?? null,
                        emergencyContact: row.emergencyContact ?? null,
                        emergencyPhone: row.emergencyPhone ?? null,
                        allergies: toJsonInput(row.allergies),
                        medicalNotes: toJsonInput(row.medicalNotes),
                        isActive: row.isActive ?? true,
                        createdBy: actorUserId,
                        updatedBy: actorUserId,
                    },
                });
            }

            return rows.length;
        });
    }

    async importLabTests(
        rows: LabTestImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ) {
        return this.write(strict, async (client) => {
            for (const row of rows) {
                await client.labTest.create({
                    data: {
                        code: row.code,
                        name: row.name,
                        description: row.description ?? null,
                        category: row.category ?? null,
                        sampleType: row.sampleType ?? null,
                        defaultPrice: row.defaultPrice ?? null,
                        referenceRange: row.referenceRange ?? null,
                        isActive: row.isActive ?? true,
                        createdBy: actorUserId,
                        updatedBy: actorUserId,
                    },
                });
            }

            return rows.length;
        });
    }

    async importInventoryItems(
        rows: InventoryItemImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ) {
        return this.write(strict, async (client) => {
            for (const row of rows) {
                await client.inventoryItem.create({
                    data: {
                        inventoryCategoryId: row.inventoryCategoryId,
                        departmentId: row.departmentId ?? null,
                        sku: row.sku,
                        name: row.name,
                        description: row.description ?? null,
                        unitOfMeasure: row.unitOfMeasure,
                        currentStock: row.currentStock,
                        reorderLevel: row.reorderLevel,
                        unitCost: row.unitCost ?? null,
                        expiryDate: row.expiryDate ?? null,
                        isActive: row.isActive ?? true,
                        createdBy: actorUserId,
                        updatedBy: actorUserId,
                    },
                });
            }

            return rows.length;
        });
    }

    async importServiceCatalog(
        rows: ServiceCatalogImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ) {
        return this.write(strict, async (client) => {
            for (const row of rows) {
                await client.serviceCatalog.create({
                    data: {
                        departmentId: row.departmentId,
                        name: row.name,
                        description: row.description ?? null,
                        defaultDurationMinutes: row.defaultDurationMinutes,
                        defaultPrice: row.defaultPrice,
                        isActive: row.isActive ?? true,
                        sortOrder: row.sortOrder ?? 0,
                        createdBy: actorUserId,
                        updatedBy: actorUserId,
                    },
                });
            }

            return rows.length;
        });
    }

    async importStaff(
        rows: StaffImportData[],
        actorUserId: string | undefined,
        strict: boolean,
    ) {
        return this.write(strict, async (client) => {
            for (const row of rows) {
                await client.staffProfile.create({
                    data: {
                        userId: row.userId,
                        staffPositionTypeId: row.staffPositionTypeId,
                        employeeCode: row.employeeCode,
                        specialization: row.specialization ?? null,
                        licenseNumber: row.licenseNumber ?? null,
                        employmentStatus:
                            (row.employmentStatus as EmploymentStatus | undefined) ??
                            EmploymentStatus.ACTIVE,
                        hireDate: row.hireDate ?? null,
                        bio: row.bio ?? null,
                        isPublicProfile: row.isPublicProfile ?? false,
                        createdBy: actorUserId,
                        updatedBy: actorUserId,
                        departmentAssignments: {
                            create: row.departments.map((department) => ({
                                departmentId: department.departmentId,
                                isPrimary: department.isPrimary,
                                createdBy: actorUserId,
                                updatedBy: actorUserId,
                            })),
                        },
                    },
                });
            }

            return rows.length;
        });
    }

    private async exportPatients(): Promise<DataExchangeRow[]> {
        const patients = await prisma.patient.findMany({
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        });

        return patients.map((patient) => ({
            id: patient.id,
            userId: patient.userId,
            firstName: patient.firstName,
            lastName: patient.lastName,
            email: patient.email,
            phone: patient.phone,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            bloodType: patient.bloodType,
            personalNumber: decryptPersonalNumber(patient.personalNumber),
            address: patient.address,
            emergencyContact: patient.emergencyContact,
            emergencyPhone: patient.emergencyPhone,
            isActive: patient.isActive,
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt,
        }));
    }

    private async exportAppointments(): Promise<DataExchangeRow[]> {
        const appointments = await prisma.appointment.findMany({
            orderBy: { scheduledAt: 'desc' },
            include: {
                patient: { select: { firstName: true, lastName: true } },
                department: { select: { name: true } },
                serviceCatalog: { select: { name: true } },
                staffProfile: {
                    select: {
                        employeeCode: true,
                        specialization: true,
                    },
                },
            },
        });

        return appointments.map((appointment) => ({
            id: appointment.id,
            patientId: appointment.patientId,
            patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
            departmentId: appointment.departmentId,
            departmentName: appointment.department.name,
            serviceCatalogId: appointment.serviceCatalogId,
            serviceName: appointment.serviceCatalog.name,
            staffProfileId: appointment.staffProfileId,
            staffLabel: appointment.staffProfile
                ? [appointment.staffProfile.employeeCode, appointment.staffProfile.specialization]
                      .filter(Boolean)
                      .join(' - ')
                : null,
            status: appointment.status,
            appointmentType: appointment.appointmentType,
            scheduledAt: appointment.scheduledAt,
            endAt: appointment.endAt,
            durationMinutes: appointment.durationMinutes,
            basePrice: appointment.basePrice,
            createdAt: appointment.createdAt,
        }));
    }

    private async exportLabResults(): Promise<DataExchangeRow[]> {
        const items = await prisma.labOrderItem.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                labTest: { select: { id: true, code: true, name: true } },
                labOrder: {
                    select: {
                        id: true,
                        patientId: true,
                        orderedAt: true,
                        patient: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });

        return items.map((item) => ({
            labOrderId: item.labOrderId,
            labOrderItemId: item.id,
            patientId: item.labOrder.patientId,
            patientName: `${item.labOrder.patient.firstName} ${item.labOrder.patient.lastName}`,
            labTestId: item.labTest.id,
            labTestCode: item.labTest.code,
            labTestName: item.labTest.name,
            resultValue: item.resultValue,
            resultUnit: item.resultUnit,
            resultStatus: item.resultStatus,
            isCritical: item.isCritical,
            completedAt: item.completedAt,
            orderedAt: item.labOrder.orderedAt,
        }));
    }

    private async exportInventoryItems(): Promise<DataExchangeRow[]> {
        const items = await prisma.inventoryItem.findMany({
            orderBy: { name: 'asc' },
            include: {
                inventoryCategory: { select: { name: true } },
                department: { select: { name: true } },
            },
        });

        return items.map((item) => ({
            id: item.id,
            sku: item.sku,
            name: item.name,
            categoryId: item.inventoryCategoryId,
            categoryName: item.inventoryCategory.name,
            departmentId: item.departmentId,
            departmentName: item.department?.name ?? null,
            unitOfMeasure: item.unitOfMeasure,
            currentStock: item.currentStock,
            reorderLevel: item.reorderLevel,
            unitCost: item.unitCost,
            expiryDate: item.expiryDate,
            isActive: item.isActive,
            createdAt: item.createdAt,
        }));
    }

    private async exportBillings(): Promise<DataExchangeRow[]> {
        const billings = await prisma.billing.findMany({
            orderBy: { issuedAt: 'desc' },
            include: {
                patient: { select: { firstName: true, lastName: true } },
            },
        });

        return billings.map((billing) => ({
            id: billing.id,
            billingNumber: billing.billingNumber,
            patientId: billing.patientId,
            patientName: `${billing.patient.firstName} ${billing.patient.lastName}`,
            appointmentId: billing.appointmentId,
            status: billing.status,
            subtotal: billing.subtotal,
            taxAmount: billing.taxAmount,
            discountAmount: billing.discountAmount,
            totalAmount: billing.totalAmount,
            amountPaid: billing.amountPaid,
            dueDate: billing.dueDate,
            issuedAt: billing.issuedAt,
            paidAt: billing.paidAt,
        }));
    }

    private async exportStaff(): Promise<DataExchangeRow[]> {
        const staffProfiles = await prisma.staffProfile.findMany({
            orderBy: [{ employeeCode: 'asc' }, { createdAt: 'desc' }],
            include: {
                staffPositionType: { select: { name: true } },
                departmentAssignments: {
                    where: { unassignedAt: null },
                    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
                    include: {
                        department: { select: { id: true, name: true } },
                    },
                },
            },
        });
        const authProfiles = await this.authUserProfilesClient.getProfiles(
            staffProfiles.map((staffProfile) => staffProfile.userId),
        );
        const authProfilesByUserId = new Map(
            authProfiles.map((profile) => [profile.userId || profile.id, profile]),
        );

        return staffProfiles.map((staffProfile) => {
            const authProfile = authProfilesByUserId.get(staffProfile.userId);
            const fallbackUser = deriveStaffUserFallback({
                userId: staffProfile.userId,
                employeeCode: staffProfile.employeeCode,
            });
            const activeAssignments = staffProfile.departmentAssignments;
            const primaryDepartment =
                activeAssignments.find((assignment) => assignment.isPrimary)?.department ??
                activeAssignments[0]?.department;

            return {
                id: staffProfile.id,
                userId: staffProfile.userId,
                firstName: authProfile?.firstName ?? fallbackUser.firstName,
                lastName: authProfile?.lastName ?? fallbackUser.lastName,
                email: authProfile?.email ?? fallbackUser.email,
                phone: authProfile?.phone ?? fallbackUser.phone,
                employeeCode: staffProfile.employeeCode,
                positionType: staffProfile.staffPositionType.name,
                specialization: staffProfile.specialization,
                licenseNumber: staffProfile.licenseNumber,
                employmentStatus: staffProfile.employmentStatus,
                hireDate: staffProfile.hireDate,
                isPublicProfile: staffProfile.isPublicProfile,
                departmentIds: activeAssignments
                    .map((assignment) => assignment.departmentId)
                    .join(', '),
                departmentNames: activeAssignments
                    .map((assignment) => assignment.department.name)
                    .join(', '),
                primaryDepartment: primaryDepartment?.name ?? null,
                createdAt: staffProfile.createdAt,
                updatedAt: staffProfile.updatedAt,
            };
        });
    }

    private async exportAuditLogs(): Promise<DataExchangeRow[]> {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5000,
        });

        return logs.map((log) => ({
            id: log.id,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            performedByUserId: log.performedByUserId,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            requestId: log.requestId,
            metadata: log.metadata,
            createdAt: log.createdAt,
        }));
    }

    private async write<T>(
        strict: boolean,
        work: (client: DatabaseClient) => Promise<T>,
    ) {
        if (strict) {
            return prisma.$transaction((client) => work(client));
        }

        return work(prisma as unknown as DatabaseClient);
    }
}
