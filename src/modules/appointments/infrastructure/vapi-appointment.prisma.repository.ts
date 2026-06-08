import { Prisma } from '../../../generated/prisma';
import { prisma } from '../../../infrastructure/db/prisma';
import {
    decryptPersonalNumber,
    encryptPersonalNumber,
    hashPersonalNumber,
} from '../../patients/domain/patient.crypto';
import {
    normalizeEmail,
    normalizeOptionalText,
    normalizePersonalNumber,
} from '../../patients/domain/patient.normalizer';
import {
    CreateVapiPatientData,
    SearchDepartmentsFilters,
    SearchDoctorsFilters,
    SearchServicesFilters,
    VapiAppointmentRepository,
} from '../domain/vapi-appointment.repository';
import {
    VapiDepartmentCandidate,
    VapiDoctorCandidate,
    VapiPatientCandidate,
    VapiServiceCandidate,
} from '../domain/vapi-appointment.types';
import {
    AuthUserProfile,
    AuthUserProfileClient,
    HttpAuthUserProfileClient,
} from './auth-user-profile.client';

const DEFAULT_LIMIT = 10;
const MAX_DOCTOR_SCAN = 150;

const staffInclude = {
    staffPositionType: {
        select: {
            name: true,
            defaultRoleKey: true,
        },
    },
    departmentAssignments: {
        where: {
            unassignedAt: null,
            department: {
                isActive: true,
            },
        },
        orderBy: [{ isPrimary: 'desc' as const }, { assignedAt: 'asc' as const }],
        include: {
            department: {
                select: {
                    id: true,
                    name: true,
                    isActive: true,
                },
            },
        },
    },
};

type StaffRecord = Prisma.StaffProfileGetPayload<{
    include: typeof staffInclude;
}>;

type ServiceRecord = Prisma.ServiceCatalogGetPayload<{
    include: {
        department: {
            select: {
                id: true;
                name: true;
                isActive: true;
            };
        };
    };
}>;

function decimalToNumber(value: unknown) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    if (value && typeof value === 'object' && 'toNumber' in value) {
        return (value as { toNumber: () => number }).toNumber();
    }

    return Number(value);
}

function normalizeSearchText(value?: string | null) {
    return (value ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\bdr\.?\b/gi, '')
        .replace(/[^a-z0-9]+/gi, ' ')
        .trim()
        .toLowerCase();
}

function textMatches(search: string | undefined, values: Array<string | null | undefined>) {
    if (!search) return true;

    const normalizedSearch = normalizeSearchText(search);
    if (!normalizedSearch) return true;

    const searchableText = normalizeSearchText(values.filter(Boolean).join(' '));

    return searchableText.includes(normalizedSearch);
}

function staffFallbackName(staff: StaffRecord) {
    return staff.specialization
        ? `${staff.employeeCode} - ${staff.specialization}`
        : staff.employeeCode;
}

function profileFullName(profile?: AuthUserProfile) {
    if (!profile) return null;

    const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();

    return fullName.length > 0 ? fullName : null;
}

function roleLooksLikeDoctor(profile: AuthUserProfile | undefined, staff: StaffRecord) {
    const roleValues = [
        profile?.role,
        ...(profile?.roles ?? []),
        staff.staffPositionType.name,
        staff.staffPositionType.defaultRoleKey,
    ]
        .filter(Boolean)
        .join(' ');

    return normalizeSearchText(roleValues).includes('doctor');
}

function staffDisplayName(staff: StaffRecord, profile?: AuthUserProfile) {
    const fullName = profileFullName(profile);

    if (!fullName) {
        return staffFallbackName(staff);
    }

    return roleLooksLikeDoctor(profile, staff) ? `Dr. ${fullName}` : fullName;
}

function toDoctorCandidate(
    staff: StaffRecord,
    profile?: AuthUserProfile,
): VapiDoctorCandidate {
    return {
        id: staff.id,
        userId: staff.userId,
        displayName: staffDisplayName(staff, profile),
        employeeCode: staff.employeeCode,
        specialization: staff.specialization,
        departments: staff.departmentAssignments.map((assignment) => ({
            id: assignment.departmentId,
            name: assignment.department.name,
            isPrimary: assignment.isPrimary,
        })),
    };
}

function toServiceCandidate(service: ServiceRecord): VapiServiceCandidate {
    return {
        id: service.id,
        name: service.name,
        departmentId: service.departmentId,
        departmentName: service.department.name,
        defaultDurationMinutes: service.defaultDurationMinutes,
        defaultPrice: decimalToNumber(service.defaultPrice),
    };
}

function toPatientCandidate(patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    personalNumber: string | null;
}): VapiPatientCandidate {
    return {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        personalNumber: decryptPersonalNumber(patient.personalNumber),
    };
}

export class VapiAppointmentPrismaRepository
    implements VapiAppointmentRepository {
    constructor(
        private readonly authProfileClient: AuthUserProfileClient =
            new HttpAuthUserProfileClient(),
    ) {}

    async searchDoctors(filters: SearchDoctorsFilters): Promise<VapiDoctorCandidate[]> {
        const limit = filters.limit ?? DEFAULT_LIMIT;
        const staffProfiles = await prisma.staffProfile.findMany({
            where: {
                employmentStatus: 'ACTIVE',
                isPublicProfile: true,
                departmentAssignments: {
                    some: {
                        departmentId: filters.departmentId,
                        unassignedAt: null,
                        department: {
                            isActive: true,
                        },
                    },
                },
            },
            orderBy: [{ employeeCode: 'asc' }, { createdAt: 'desc' }],
            take: filters.name ? MAX_DOCTOR_SCAN : limit,
            include: staffInclude,
        });
        const profiles = await this.authProfileClient.getProfiles(
            staffProfiles.map((staff) => staff.userId),
        );
        const profilesByUserId = new Map(
            profiles.map((profile) => [profile.userId ?? profile.id, profile]),
        );

        return staffProfiles
            .map((staff) => {
                const profile = profilesByUserId.get(staff.userId);
                return {
                    candidate: toDoctorCandidate(staff, profile),
                    profile,
                    staff,
                };
            })
            .filter(({ candidate, profile, staff }) =>
                textMatches(filters.name, [
                    candidate.displayName,
                    profile?.firstName,
                    profile?.lastName,
                    profile?.username,
                    staff.employeeCode,
                    staff.specialization,
                    staff.bio,
                    staff.staffPositionType.name,
                    ...candidate.departments.map((department) => department.name),
                ]),
            )
            .slice(0, limit)
            .map(({ candidate }) => candidate);
    }

    async searchServices(
        filters: SearchServicesFilters,
    ): Promise<VapiServiceCandidate[]> {
        const services = await prisma.serviceCatalog.findMany({
            where: {
                isActive: true,
                departmentId: filters.departmentId,
                department: {
                    isActive: true,
                },
                name: filters.name
                    ? {
                          contains: filters.name,
                          mode: 'insensitive',
                      }
                    : undefined,
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            take: filters.limit ?? DEFAULT_LIMIT,
        });

        return services.map(toServiceCandidate);
    }

    async searchDepartments(
        filters: SearchDepartmentsFilters,
    ): Promise<VapiDepartmentCandidate[]> {
        return prisma.department.findMany({
            where: {
                isActive: true,
                name: filters.name
                    ? {
                          contains: filters.name,
                          mode: 'insensitive',
                      }
                    : undefined,
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            take: filters.limit ?? DEFAULT_LIMIT,
        });
    }

    async findPatientByPersonalNumber(
        personalNumber: string,
    ): Promise<VapiPatientCandidate | null> {
        const personalNumberHash = hashPersonalNumber(
            normalizePersonalNumber(personalNumber),
        );

        if (!personalNumberHash) {
            return null;
        }

        const patient = await prisma.patient.findFirst({
            where: {
                personalNumberHash,
                isActive: true,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                personalNumber: true,
            },
        });

        return patient ? toPatientCandidate(patient) : null;
    }

    async createPatient(data: CreateVapiPatientData): Promise<VapiPatientCandidate> {
        const personalNumber = normalizePersonalNumber(data.personalNumber);
        const personalNumberHash = hashPersonalNumber(personalNumber);

        const patient = await prisma.patient.create({
            data: {
                userId: null,
                firstName: normalizeOptionalText(data.firstName) ?? data.firstName,
                lastName: normalizeOptionalText(data.lastName) ?? data.lastName,
                email: normalizeEmail(data.email),
                phone: normalizeOptionalText(data.phone),
                dateOfBirth: data.dateOfBirth ?? null,
                personalNumber: encryptPersonalNumber(personalNumber),
                personalNumberHash,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                personalNumber: true,
            },
        });

        return toPatientCandidate(patient);
    }
}
