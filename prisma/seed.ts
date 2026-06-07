import {
    AppointmentStatus,
    AppointmentType,
    BillingStatus,
    BloodType,
    EmploymentStatus,
    InventoryTransactionType,
    LabOrderStatus,
    LabResultStatus,
    PaymentMethod,
    PharmacyStatus,
    Prisma,
} from '../src/generated/prisma';
import { prisma } from '../src/infrastructure/db/prisma';
import {
    encryptPersonalNumber,
    hashPersonalNumber,
} from '../src/modules/patients/domain/patient.crypto';

const DEMO_USER_IDS = {
    admin: process.env.AUTH_DEMO_ADMIN_USER_ID ?? '11111111-1111-4111-8111-111111111111',
    clinicAdmin:
        process.env.AUTH_DEMO_CLINIC_ADMIN_USER_ID ?? '11111111-1111-4111-8111-111111111112',
    doctor: process.env.AUTH_DEMO_DOCTOR_USER_ID ?? '22222222-2222-4222-8222-222222222222',
    cardiologist:
        process.env.AUTH_DEMO_CARDIOLOGIST_USER_ID ?? '22222222-2222-4222-8222-222222222223',
    pediatrician:
        process.env.AUTH_DEMO_PEDIATRICIAN_USER_ID ?? '22222222-2222-4222-8222-222222222224',
    nurse: process.env.AUTH_DEMO_NURSE_USER_ID ?? '33333333-3333-4333-8333-333333333333',
    emergencyNurse:
        process.env.AUTH_DEMO_EMERGENCY_NURSE_USER_ID ?? '33333333-3333-4333-8333-333333333334',
    receptionist:
        process.env.AUTH_DEMO_RECEPTIONIST_USER_ID ?? '44444444-4444-4444-8444-444444444444',
    labTechnician:
        process.env.AUTH_DEMO_LAB_TECHNICIAN_USER_ID ?? '88888888-8888-4888-8888-888888888888',
    pharmacist:
        process.env.AUTH_DEMO_PHARMACIST_USER_ID ?? '99999999-9999-4999-8999-999999999999',
    patient: process.env.AUTH_DEMO_PATIENT_USER_ID ?? '55555555-5555-4555-8555-555555555555',
    patientSamir:
        process.env.AUTH_DEMO_PATIENT_SAMIR_USER_ID ?? '55555555-5555-4555-8555-555555555556',
    patientLina:
        process.env.AUTH_DEMO_PATIENT_LINA_USER_ID ?? '55555555-5555-4555-8555-555555555557',
} as const;

const FIXTURE_IDS = {
    patientJohn: '66666666-6666-4666-8666-666666666666',
    patientMaria: '77777777-7777-4777-8777-777777777777',
    appointmentCheckedIn: '20000000-0000-4000-8000-000000000001',
    appointmentConfirmed: '20000000-0000-4000-8000-000000000002',
    appointmentCompletedToday: '20000000-0000-4000-8000-000000000003',
    appointmentTomorrow: '20000000-0000-4000-8000-000000000004',
    appointmentCompletedPast: '20000000-0000-4000-8000-000000000005',
    appointmentDoctorUpcoming: '20000000-0000-4000-8000-000000000006',
    medicalRecordPatient: '30000000-0000-4000-8000-000000000001',
    medicalRecordJohn: '30000000-0000-4000-8000-000000000002',
    prescriptionPatient: '40000000-0000-4000-8000-000000000001',
    prescriptionItemPatient: '40000000-0000-4000-8000-000000000002',
    pharmacyQueuePatient: '40000000-0000-4000-8000-000000000003',
    pharmacyDispensingItem: '40000000-0000-4000-8000-000000000004',
    labOrderReview: '50000000-0000-4000-8000-000000000001',
    labOrderActive: '50000000-0000-4000-8000-000000000002',
    billingPaid: '60000000-0000-4000-8000-000000000001',
    billingPending: '60000000-0000-4000-8000-000000000002',
    billingPaidItem: '60000000-0000-4000-8000-000000000003',
    billingPendingItem: '60000000-0000-4000-8000-000000000004',
    paymentPaid: '60000000-0000-4000-8000-000000000005',
    feedbackJohn: '70000000-0000-4000-8000-000000000001',
    contactMessage: '80000000-0000-4000-8000-000000000001',
    auditLog: '90000000-0000-4000-8000-000000000001',
} as const;

const LEGACY_INVALID_UUIDS = {
    users: [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-000000000005',
    ],
    staff: [
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-000000000004',
    ],
    patients: [
        '00000000-0000-0000-0000-000000000005',
        '10000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
    ],
    appointments: [
        '20000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000005',
    ],
    medicalRecords: [
        '30000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000002',
    ],
    prescriptions: ['40000000-0000-0000-0000-000000000001'],
    prescriptionItems: ['40000000-0000-0000-0000-000000000002'],
    pharmacyQueue: ['40000000-0000-0000-0000-000000000003'],
    pharmacyDispensingItems: ['40000000-0000-0000-0000-000000000004'],
    labOrders: [
        '50000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000002',
    ],
    labOrderItems: [
        '51000000-0000-0000-0000-000000000001',
        '51000000-0000-0000-0000-000000000002',
    ],
    billings: [
        '60000000-0000-0000-0000-000000000001',
        '60000000-0000-0000-0000-000000000002',
    ],
    billingItems: [
        '60000000-0000-0000-0000-000000000003',
        '60000000-0000-0000-0000-000000000004',
    ],
    payments: ['60000000-0000-0000-0000-000000000005'],
    feedback: ['70000000-0000-0000-0000-000000000001'],
    contactMessages: ['80000000-0000-0000-0000-000000000001'],
    auditLogs: ['90000000-0000-0000-0000-000000000001'],
    inventoryTransactions: [
        '81000000-0000-0000-0000-000000000001',
        '81000000-0000-0000-0000-000000000002',
        '81000000-0000-0000-0000-000000000003',
    ],
} as const;

const ACTOR_USER_ID = DEMO_USER_IDS.admin;
const DEMO_PASSWORD = 'Medsphere@123';
const DAY_MS = 24 * 60 * 60 * 1000;

const PERMISSIONS = [
    'departments:read',
    'departments:manage',
    'services:read',
    'services:manage',
    'staff-types:read',
    'staff-types:manage',
    'staff:read',
    'staff:manage',
    'patients:read',
    'patients:create',
    'patients:update',
    'patients:manage',
    'appointments:read',
    'appointments:create',
    'appointments:update',
    'appointments:cancel',
    'medical_records:read',
    'medical_records:write',
    'prescriptions:read',
    'prescriptions:write',
    'lab_tests:read',
    'lab_tests:manage',
    'lab_orders:read',
    'lab_orders:create',
    'lab_orders:update',
    'lab_results:read',
    'lab_results:enter',
    'lab_results:review',
    'inventory:read',
    'inventory:manage',
    'pharmacy:read',
    'pharmacy:dispense',
    'billing:read',
    'billing:manage',
    'dashboard:read',
    'feedback:read',
    'feedback:manage',
    'contact:read',
    'contact:manage',
    'audit_logs:read',
    'reports:generate',
    'settings:read',
    'settings:manage',
] as const;

const SETTINGS = [
    {
        key: 'facility_name',
        value: 'MedSphere Demo Clinic',
        description: 'Facility display name',
        isPublic: true,
    },
    {
        key: 'facility_tagline',
        value: 'Health. Connected.',
        description: 'Short public tagline shown on the website',
        isPublic: true,
    },
    {
        key: 'facility_description',
        value: 'Departments, service catalogs, staff workflows, patient portals, records, diagnostics, billing, and AI support in one connected system.',
        description: 'Public summary shown across website pages',
        isPublic: true,
    },
    {
        key: 'facility_address',
        value: '44 Lakeview Avenue, Springfield',
        description: 'Public contact address shown on the website',
        isPublic: true,
    },
    {
        key: 'contact_phone',
        value: '+1 (555) 010-2400',
        description: 'Public phone number shown on the website',
        isPublic: true,
    },
    {
        key: 'contact_email',
        value: 'hello@medsphere.local',
        description: 'Public contact email shown on the website',
        isPublic: true,
    },
    {
        key: 'default_slot_duration',
        value: 30,
        description: 'Default appointment slot duration in minutes',
        isPublic: false,
    },
    {
        key: 'working_hours',
        value: {
            monday: { start: '08:00', end: '18:00' },
            tuesday: { start: '08:00', end: '18:00' },
            wednesday: { start: '08:00', end: '18:00' },
            thursday: { start: '08:00', end: '18:00' },
            friday: { start: '08:00', end: '18:00' },
            saturday: { start: '09:00', end: '13:00' },
            sunday: { isClosed: true },
        },
        description: 'Facility-wide working hours',
        isPublic: true,
    },
    {
        key: 'appointment_reminder_24h',
        value: true,
        description: 'Enable 24-hour appointment reminders',
        isPublic: false,
    },
    {
        key: 'auth.super_admin_reference',
        value: {
            userId: DEMO_USER_IDS.admin,
        },
        description: 'Reference UUID for the Auth Service super admin account',
        isPublic: false,
    },
] as const;

const STAFF_POSITION_TYPES = [
    {
        name: 'Administrator',
        description: 'Clinic operations and administration profile',
        defaultRoleKey: 'admin',
    },
    {
        name: 'Doctor',
        description: 'Medical practitioner profile',
        defaultRoleKey: 'doctor',
    },
    {
        name: 'Nurse',
        description: 'Nursing and triage profile',
        defaultRoleKey: 'nurse',
    },
    {
        name: 'Receptionist',
        description: 'Front-desk and scheduling profile',
        defaultRoleKey: 'receptionist',
    },
    {
        name: 'Lab Technician',
        description: 'Laboratory operations profile',
        defaultRoleKey: 'lab_technician',
    },
    {
        name: 'Pharmacist',
        description: 'Pharmacy dispensing profile',
        defaultRoleKey: 'pharmacist',
    },
] as const;

const LAB_TESTS = [
    {
        code: 'CBC',
        name: 'Complete Blood Count',
        description: 'Automated blood count with differential.',
        category: 'Hematology',
        sampleType: 'Blood',
        defaultPrice: '45.00',
        referenceRange: 'Hemoglobin 12.0 - 16.0 g/dL',
    },
    {
        code: 'BMP',
        name: 'Basic Metabolic Panel',
        description: 'Serum electrolyte and renal function panel.',
        category: 'Chemistry',
        sampleType: 'Blood',
        defaultPrice: '60.00',
        referenceRange: 'Glucose 70 - 110 mg/dL',
    },
    {
        code: 'LIPID',
        name: 'Lipid Panel',
        description: 'Cholesterol, LDL, HDL, and triglycerides.',
        category: 'Chemistry',
        sampleType: 'Blood',
        defaultPrice: '55.00',
        referenceRange: 'LDL under 100 mg/dL',
    },
    {
        code: 'HBA1C',
        name: 'Hemoglobin A1c',
        description: 'Average blood glucose marker over roughly 3 months.',
        category: 'Endocrinology',
        sampleType: 'Blood',
        defaultPrice: '52.00',
        referenceRange: 'Below 5.7%',
    },
    {
        code: 'TSH',
        name: 'Thyroid Stimulating Hormone',
        description: 'Screening test for thyroid function.',
        category: 'Endocrinology',
        sampleType: 'Blood',
        defaultPrice: '48.00',
        referenceRange: '0.4 - 4.0 mIU/L',
    },
    {
        code: 'CRP',
        name: 'C-Reactive Protein',
        description: 'Inflammation marker used in acute and chronic review.',
        category: 'Immunology',
        sampleType: 'Blood',
        defaultPrice: '42.00',
        referenceRange: 'Below 10 mg/L',
    },
    {
        code: 'UA',
        name: 'Urinalysis',
        description: 'Dipstick and microscopic urine screening.',
        category: 'Urine',
        sampleType: 'Urine',
        defaultPrice: '30.00',
        referenceRange: 'Negative for protein, glucose, and ketones',
    },
    {
        code: 'TROP',
        name: 'Troponin I',
        description: 'Cardiac marker for acute chest-pain assessment.',
        category: 'Cardiology',
        sampleType: 'Blood',
        defaultPrice: '90.00',
        referenceRange: 'Below 0.04 ng/mL',
    },
    {
        code: 'COVID-AG',
        name: 'COVID-19 Antigen',
        description: 'Rapid antigen test for symptomatic screening.',
        category: 'Infectious Disease',
        sampleType: 'Nasopharyngeal swab',
        defaultPrice: '35.00',
        referenceRange: 'Negative',
    },
    {
        code: 'LFT',
        name: 'Liver Function Panel',
        description: 'ALT, AST, bilirubin, and alkaline phosphatase profile.',
        category: 'Chemistry',
        sampleType: 'Blood',
        defaultPrice: '65.00',
        referenceRange: 'ALT 7 - 56 U/L',
    },
] as const;

const INVENTORY_CATEGORIES = [
    {
        name: 'Consumables',
        description: 'Single-use medical and administrative supplies',
    },
    {
        name: 'Medications',
        description: 'Pharmacy-managed medications and treatment stock',
    },
    {
        name: 'Laboratory Supplies',
        description: 'Sample collection and diagnostic supplies',
    },
    {
        name: 'Medical Devices',
        description: 'Reusable and semi-reusable clinical devices',
    },
    {
        name: 'Vaccines',
        description: 'Cold-chain immunization inventory',
    },
    {
        name: 'Radiology Supplies',
        description: 'Imaging and radiology support supplies',
    },
    {
        name: 'Office Supplies',
        description: 'Administrative and patient-facing office stock',
    },
] as const;

function startOfUtcDay(date = new Date()) {
    return new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
    ));
}

function addUtcDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_MS);
}

function isClinicWeekday(date: Date) {
    const day = date.getUTCDay();

    return day >= 1 && day <= 5;
}

function nearestClinicWeekday(date: Date, direction: 1 | -1) {
    let value = new Date(date);

    while (!isClinicWeekday(value)) {
        value = addUtcDays(value, direction);
    }

    return value;
}

function addClinicWeekdays(date: Date, offset: number) {
    let value = nearestClinicWeekday(date, offset < 0 ? -1 : 1);
    let remaining = Math.abs(offset);
    const direction = offset < 0 ? -1 : 1;

    while (remaining > 0) {
        value = addUtcDays(value, direction);

        if (isClinicWeekday(value)) {
            remaining -= 1;
        }
    }

    return value;
}

function utcAt(dayOffset: number, hour: number, minute = 0) {
    const day = addClinicWeekdays(startOfUtcDay(), dayOffset);
    day.setUTCHours(hour, minute, 0, 0);

    return day;
}

function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}

function dateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
}

function fixtureUuid(prefix: string, index: number) {
    return `${prefix}-0000-4000-8000-${index.toString().padStart(12, '0')}`;
}

function auditJson(value: unknown) {
    return value === undefined || value === null
        ? Prisma.JsonNull
        : value as Prisma.InputJsonValue;
}

function personalNumberData(personalNumber: string) {
    return {
        personalNumber: encryptPersonalNumber(personalNumber),
        personalNumberHash: hashPersonalNumber(personalNumber),
    };
}

async function seedPermissions() {
    for (const permissionName of PERMISSIONS) {
        await prisma.servicePermission.upsert({
            where: {
                name_scope: {
                    name: permissionName,
                    scope: 'all',
                },
            },
            update: {
                description: `${permissionName} permission`,
            },
            create: {
                name: permissionName,
                scope: 'all',
                description: `${permissionName} permission`,
            },
        });
    }
}

async function seedSettings() {
    for (const setting of SETTINGS) {
        await prisma.setting.upsert({
            where: { key: setting.key },
            update: {
                value: setting.value,
                description: setting.description,
                isPublic: setting.isPublic,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                ...setting,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
    }
}

async function seedStaffPositionTypes() {
    for (const positionType of STAFF_POSITION_TYPES) {
        await prisma.staffPositionType.upsert({
            where: { name: positionType.name },
            update: {
                description: positionType.description,
                defaultRoleKey: positionType.defaultRoleKey,
                applicableDepartmentIds: Prisma.JsonNull,
                isActive: true,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                ...positionType,
                applicableDepartmentIds: Prisma.JsonNull,
                isActive: true,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
    }
}

async function seedLabTests() {
    for (const test of LAB_TESTS) {
        await prisma.labTest.upsert({
            where: { code: test.code },
            update: {
                name: test.name,
                description: test.description,
                category: test.category,
                sampleType: test.sampleType,
                defaultPrice: test.defaultPrice,
                referenceRange: test.referenceRange,
                isActive: true,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                ...test,
                isActive: true,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
    }
}

async function seedInventoryCategories() {
    for (const category of INVENTORY_CATEGORIES) {
        await prisma.inventoryCategory.upsert({
            where: { name: category.name },
            update: {
                description: category.description,
                isActive: true,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                ...category,
                isActive: true,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
    }
}

async function seedDepartmentsAndServices() {
    const primaryCare = await prisma.department.upsert({
        where: { name: 'Primary Care' },
        update: {
            description: 'Family medicine, triage, and follow-up care',
            floor: '1',
            phoneExtension: '101',
            operatingHours: { weekdays: '08:00-18:00', saturday: '09:00-13:00' },
            isActive: true,
            sortOrder: 1,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            name: 'Primary Care',
            description: 'Family medicine, triage, and follow-up care',
            floor: '1',
            phoneExtension: '101',
            operatingHours: { weekdays: '08:00-18:00', saturday: '09:00-13:00' },
            isActive: true,
            sortOrder: 1,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    const diagnostics = await prisma.department.upsert({
        where: { name: 'Diagnostics' },
        update: {
            description: 'Laboratory diagnostics and sample processing',
            floor: '2',
            phoneExtension: '202',
            operatingHours: { weekdays: '08:00-17:00' },
            isActive: true,
            sortOrder: 2,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            name: 'Diagnostics',
            description: 'Laboratory diagnostics and sample processing',
            floor: '2',
            phoneExtension: '202',
            operatingHours: { weekdays: '08:00-17:00' },
            isActive: true,
            sortOrder: 2,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    const pharmacy = await prisma.department.upsert({
        where: { name: 'Pharmacy' },
        update: {
            description: 'Medication dispensing and stock coordination',
            floor: '1',
            phoneExtension: '130',
            operatingHours: { weekdays: '08:00-18:00' },
            isActive: true,
            sortOrder: 3,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            name: 'Pharmacy',
            description: 'Medication dispensing and stock coordination',
            floor: '1',
            phoneExtension: '130',
            operatingHours: { weekdays: '08:00-18:00' },
            isActive: true,
            sortOrder: 3,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    const generalConsultation = await upsertService(
        primaryCare.id,
        'General Consultation',
        'Routine family medicine consultation',
        30,
        '85.00',
        1,
    );
    const followUp = await upsertService(
        primaryCare.id,
        'Follow-up Consultation',
        'Follow-up review after treatment or testing',
        20,
        '55.00',
        2,
    );
    const nurseTriage = await upsertService(
        primaryCare.id,
        'Nursing Triage',
        'Vitals, intake, and care-coordination visit',
        20,
        '35.00',
        3,
    );
    const labReview = await upsertService(
        diagnostics.id,
        'Lab Review',
        'Diagnostic sample review and interpretation',
        20,
        '45.00',
        1,
    );

    return {
        departments: {
            primaryCare,
            diagnostics,
            pharmacy,
        },
        services: {
            generalConsultation,
            followUp,
            nurseTriage,
            labReview,
        },
    };
}

async function upsertDepartment(input: {
    name: string;
    description: string;
    floor: string;
    phoneExtension: string;
    operatingHours: Prisma.InputJsonValue;
    sortOrder: number;
}) {
    return prisma.department.upsert({
        where: { name: input.name },
        update: {
            description: input.description,
            floor: input.floor,
            phoneExtension: input.phoneExtension,
            operatingHours: input.operatingHours,
            isActive: true,
            sortOrder: input.sortOrder,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            ...input,
            isActive: true,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
}

async function upsertService(
    departmentId: string,
    name: string,
    description: string,
    defaultDurationMinutes: number,
    defaultPrice: string,
    sortOrder: number,
) {
    return prisma.serviceCatalog.upsert({
        where: {
            departmentId_name: {
                departmentId,
                name,
            },
        },
        update: {
            description,
            defaultDurationMinutes,
            defaultPrice,
            isActive: true,
            sortOrder,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            departmentId,
            name,
            description,
            defaultDurationMinutes,
            defaultPrice,
            isActive: true,
            sortOrder,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
}

async function seedStaff(departments: Awaited<ReturnType<typeof seedDepartmentsAndServices>>['departments']) {
    const [doctorType, nurseType, receptionistType] = await Promise.all([
        prisma.staffPositionType.findUniqueOrThrow({ where: { name: 'Doctor' } }),
        prisma.staffPositionType.findUniqueOrThrow({ where: { name: 'Nurse' } }),
        prisma.staffPositionType.findUniqueOrThrow({ where: { name: 'Receptionist' } }),
    ]);

    const doctor = await upsertStaffProfile({
        id: DEMO_USER_IDS.doctor,
        userId: DEMO_USER_IDS.doctor,
        staffPositionTypeId: doctorType.id,
        employeeCode: 'Dr. Anika Rao',
        specialization: 'Family Medicine',
        licenseNumber: 'MD-DEMO-1001',
        hireDate: dateOnly('2022-01-10'),
        bio: 'Dr. Anika Rao is a board-certified family physician for the MedSphere demo clinic.',
        isPublicProfile: true,
    });

    const nurse = await upsertStaffProfile({
        id: DEMO_USER_IDS.nurse,
        userId: DEMO_USER_IDS.nurse,
        staffPositionTypeId: nurseType.id,
        employeeCode: 'Nurse Hana Berisha',
        specialization: 'Care Coordination',
        licenseNumber: 'RN-DEMO-1001',
        hireDate: dateOnly('2023-02-13'),
        bio: 'Hana Berisha handles intake, triage, and patient preparation across the MedSphere demo clinic.',
        isPublicProfile: true,
    });

    const receptionist = await upsertStaffProfile({
        id: DEMO_USER_IDS.receptionist,
        userId: DEMO_USER_IDS.receptionist,
        staffPositionTypeId: receptionistType.id,
        employeeCode: 'Mila Petrova',
        specialization: 'Front Desk',
        licenseNumber: null,
        hireDate: dateOnly('2023-08-01'),
        bio: 'Reception desk coordinator for booking, check-in, and billing support.',
        isPublicProfile: false,
    });

    await Promise.all([
        upsertDepartmentAssignment(doctor.id, departments.primaryCare.id, true),
        upsertDepartmentAssignment(doctor.id, departments.diagnostics.id, false),
        upsertDepartmentAssignment(nurse.id, departments.primaryCare.id, true),
        upsertDepartmentAssignment(receptionist.id, departments.primaryCare.id, true),
    ]);

    await seedStaffSchedules([
        { staffProfileId: doctor.id, departmentId: departments.primaryCare.id, startTime: '08:00', endTime: '16:00' },
        { staffProfileId: nurse.id, departmentId: departments.primaryCare.id, startTime: '07:30', endTime: '15:30' },
        {
            staffProfileId: receptionist.id,
            departmentId: departments.primaryCare.id,
            startTime: '08:00',
            endTime: '17:00',
        },
    ]);

    return { doctor, nurse, receptionist };
}

async function upsertStaffProfile(input: {
    id: string;
    userId: string;
    staffPositionTypeId: string;
    employeeCode: string;
    specialization: string;
    licenseNumber: string | null;
    hireDate: Date;
    bio: string;
    isPublicProfile: boolean;
}) {
    return prisma.staffProfile.upsert({
        where: { id: input.id },
        update: {
            userId: input.userId,
            staffPositionTypeId: input.staffPositionTypeId,
            employeeCode: input.employeeCode,
            specialization: input.specialization,
            licenseNumber: input.licenseNumber,
            employmentStatus: EmploymentStatus.ACTIVE,
            hireDate: input.hireDate,
            terminationDate: null,
            bio: input.bio,
            isPublicProfile: input.isPublicProfile,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            ...input,
            employmentStatus: EmploymentStatus.ACTIVE,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
}

async function upsertDepartmentAssignment(
    staffProfileId: string,
    departmentId: string,
    isPrimary: boolean,
) {
    return prisma.staffDepartmentAssignment.upsert({
        where: {
            staffProfileId_departmentId: {
                staffProfileId,
                departmentId,
            },
        },
        update: {
            isPrimary,
            unassignedAt: null,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            staffProfileId,
            departmentId,
            isPrimary,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
}

async function seedStaffSchedules(
    staffSchedules: Array<{
        staffProfileId: string;
        departmentId: string;
        startTime: string;
        endTime: string;
    }>,
) {
    for (const schedule of staffSchedules) {
        await prisma.staffSchedule.deleteMany({
            where: {
                staffProfileId: schedule.staffProfileId,
                departmentId: schedule.departmentId,
            },
        });

        await prisma.staffSchedule.createMany({
            data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
                staffProfileId: schedule.staffProfileId,
                departmentId: schedule.departmentId,
                dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                slotDurationMinutes: 30,
                breakStart: '12:00',
                breakEnd: '12:30',
                validFrom: dateOnly('2026-01-01'),
                isActive: true,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            })),
        });
    }
}

async function seedPatients() {
    const patient = await upsertPatient({
        id: DEMO_USER_IDS.patient,
        userId: DEMO_USER_IDS.patient,
        firstName: 'Olivia',
        lastName: 'Brown',
        email: 'patient@medsphere.local',
        phone: '+1 555 0105',
        dateOfBirth: dateOnly('1990-04-12'),
        gender: 'female',
        bloodType: BloodType.O_POSITIVE,
        personalNumber: 'MSP-PAT-0005',
        address: '44 Lakeview Avenue, Springfield',
        emergencyContact: 'Ethan Brown',
        emergencyPhone: '+1 555 0188',
        allergies: ['Penicillin'],
        medicalNotes: {
            chronicConditions: ['Seasonal asthma'],
            preferredPharmacy: 'MedSphere Pharmacy',
        },
    });

    const john = await upsertPatient({
        id: FIXTURE_IDS.patientJohn,
        userId: null,
        firstName: 'John',
        lastName: 'Carter',
        email: 'john.carter@example.local',
        phone: '+1 555 0106',
        dateOfBirth: dateOnly('1978-09-02'),
        gender: 'male',
        bloodType: BloodType.A_POSITIVE,
        personalNumber: 'MSP-PAT-0106',
        address: '12 River Road, Springfield',
        emergencyContact: 'Laura Carter',
        emergencyPhone: '+1 555 0190',
        allergies: [],
        medicalNotes: {
            chronicConditions: ['Hypertension'],
            lastVisitReason: 'Blood pressure follow-up',
        },
    });

    const maria = await upsertPatient({
        id: FIXTURE_IDS.patientMaria,
        userId: null,
        firstName: 'Maria',
        lastName: 'Novak',
        email: 'maria.novak@example.local',
        phone: '+1 555 0107',
        dateOfBirth: dateOnly('1985-11-19'),
        gender: 'female',
        bloodType: BloodType.B_POSITIVE,
        personalNumber: 'MSP-PAT-0107',
        address: '8 Cedar Street, Springfield',
        emergencyContact: 'Petar Novak',
        emergencyPhone: '+1 555 0192',
        allergies: ['Latex'],
        medicalNotes: {
            chronicConditions: [],
            lastVisitReason: 'Annual wellness',
        },
    });

    return { patient, john, maria };
}

async function upsertPatient(input: {
    id: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
    gender: string;
    bloodType: BloodType;
    personalNumber: string;
    address: string;
    emergencyContact: string;
    emergencyPhone: string;
    allergies: string[];
    medicalNotes: Record<string, unknown>;
}) {
    return prisma.patient.upsert({
        where: { id: input.id },
        update: {
            userId: input.userId,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
            bloodType: input.bloodType,
            ...personalNumberData(input.personalNumber),
            address: input.address,
            emergencyContact: input.emergencyContact,
            emergencyPhone: input.emergencyPhone,
            allergies: input.allergies,
            medicalNotes: input.medicalNotes as Prisma.InputJsonValue,
            isActive: true,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: input.id,
            userId: input.userId,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            dateOfBirth: input.dateOfBirth,
            gender: input.gender,
            bloodType: input.bloodType,
            ...personalNumberData(input.personalNumber),
            address: input.address,
            emergencyContact: input.emergencyContact,
            emergencyPhone: input.emergencyPhone,
            allergies: input.allergies,
            medicalNotes: input.medicalNotes as Prisma.InputJsonValue,
            isActive: true,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
}

async function seedInventory(departments: Awaited<ReturnType<typeof seedDepartmentsAndServices>>['departments']) {
    const [consumables, medications, laboratorySupplies] = await Promise.all([
        prisma.inventoryCategory.findUniqueOrThrow({ where: { name: 'Consumables' } }),
        prisma.inventoryCategory.findUniqueOrThrow({ where: { name: 'Medications' } }),
        prisma.inventoryCategory.findUniqueOrThrow({ where: { name: 'Laboratory Supplies' } }),
    ]);

    const gloves = await upsertInventoryItem({
        inventoryCategoryId: consumables.id,
        departmentId: departments.primaryCare.id,
        sku: 'SUP-GLOVE-M',
        name: 'Nitrile Gloves - Medium',
        description: 'Box of 100 medium nitrile gloves',
        unitOfMeasure: 'box',
        currentStock: '8',
        reorderLevel: '40',
        unitCost: '9.50',
        expiryDate: dateOnly('2027-06-30'),
    });

    const amoxicillin = await upsertInventoryItem({
        inventoryCategoryId: medications.id,
        departmentId: departments.pharmacy.id,
        sku: 'MED-AMOX-500',
        name: 'Amoxicillin 500mg',
        description: 'Capsules, 500mg strength',
        unitOfMeasure: 'capsule',
        currentStock: '48',
        reorderLevel: '25',
        unitCost: '0.42',
        expiryDate: dateOnly('2027-03-31'),
    });

    const cbcKits = await upsertInventoryItem({
        inventoryCategoryId: laboratorySupplies.id,
        departmentId: departments.diagnostics.id,
        sku: 'KIT-CBC-01',
        name: 'CBC Collection Kit',
        description: 'EDTA tube and collection supplies',
        unitOfMeasure: 'kit',
        currentStock: '12',
        reorderLevel: '10',
        unitCost: '4.25',
        expiryDate: dateOnly('2027-01-31'),
    });

    await Promise.all([
        upsertInventoryTransaction({
            id: '81000000-0000-4000-8000-000000000001',
            inventoryItemId: gloves.id,
            transactionType: InventoryTransactionType.RECEIVED,
            quantity: '8',
            unitCost: '9.50',
            batchNumber: 'GLOVE-DEMO-01',
            expiryDate: dateOnly('2027-06-30'),
            notes: 'Demo opening balance',
            performedByUserId: DEMO_USER_IDS.receptionist,
        }),
        upsertInventoryTransaction({
            id: '81000000-0000-4000-8000-000000000002',
            inventoryItemId: amoxicillin.id,
            transactionType: InventoryTransactionType.RECEIVED,
            quantity: '48',
            unitCost: '0.42',
            batchNumber: 'AMOX-DEMO-01',
            expiryDate: dateOnly('2027-03-31'),
            notes: 'Demo opening balance',
            performedByUserId: DEMO_USER_IDS.receptionist,
        }),
        upsertInventoryTransaction({
            id: '81000000-0000-4000-8000-000000000003',
            inventoryItemId: cbcKits.id,
            transactionType: InventoryTransactionType.RECEIVED,
            quantity: '12',
            unitCost: '4.25',
            batchNumber: 'CBC-DEMO-01',
            expiryDate: dateOnly('2027-01-31'),
            notes: 'Demo opening balance',
            performedByUserId: DEMO_USER_IDS.nurse,
        }),
    ]);

    return { gloves, amoxicillin, cbcKits };
}

async function upsertInventoryItem(input: {
    inventoryCategoryId: string;
    departmentId: string;
    sku: string;
    name: string;
    description: string;
    unitOfMeasure: string;
    currentStock: string;
    reorderLevel: string;
    unitCost: string;
    expiryDate: Date;
}) {
    return prisma.inventoryItem.upsert({
        where: { sku: input.sku },
        update: {
            inventoryCategoryId: input.inventoryCategoryId,
            departmentId: input.departmentId,
            name: input.name,
            description: input.description,
            unitOfMeasure: input.unitOfMeasure,
            currentStock: input.currentStock,
            reorderLevel: input.reorderLevel,
            unitCost: input.unitCost,
            expiryDate: input.expiryDate,
            isActive: true,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            ...input,
            isActive: true,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
}

async function upsertInventoryTransaction(input: {
    id: string;
    inventoryItemId: string;
    transactionType: InventoryTransactionType;
    quantity: string;
    unitCost: string;
    batchNumber: string;
    expiryDate: Date;
    notes: string;
    performedByUserId: string;
}) {
    return prisma.inventoryTransaction.upsert({
        where: { id: input.id },
        update: {
            ...input,
            referenceEntityType: 'seed',
            referenceEntityId: 'demo-fixture',
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            ...input,
            referenceEntityType: 'seed',
            referenceEntityId: 'demo-fixture',
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
}

async function seedAppointments(
    patients: Awaited<ReturnType<typeof seedPatients>>,
    staff: Awaited<ReturnType<typeof seedStaff>>,
    departmentsAndServices: Awaited<ReturnType<typeof seedDepartmentsAndServices>>,
) {
    const { departments, services } = departmentsAndServices;
    const checkedInStart = utcAt(1, 9, 0);
    const confirmedStart = utcAt(1, 10, 30);
    const completedStart = utcAt(-1, 11, 30);
    const tomorrowStart = utcAt(2, 9, 30);
    const pastStart = utcAt(-2, 14, 0);
    const doctorUpcomingStart = utcAt(1, 15, 0);

    const checkedIn = await upsertAppointment({
        id: FIXTURE_IDS.appointmentCheckedIn,
        patientId: patients.patient.id,
        departmentId: departments.primaryCare.id,
        serviceCatalogId: services.generalConsultation.id,
        staffProfileId: staff.doctor.id,
        status: AppointmentStatus.CHECKED_IN,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: checkedInStart,
        endAt: addMinutes(checkedInStart, 30),
        durationMinutes: 30,
        basePrice: '85.00',
        notes: 'Demo patient checked in for asthma follow-up.',
        checkedInAt: addMinutes(checkedInStart, -10),
        completedAt: null,
    });

    const confirmed = await upsertAppointment({
        id: FIXTURE_IDS.appointmentConfirmed,
        patientId: patients.john.id,
        departmentId: departments.primaryCare.id,
        serviceCatalogId: services.followUp.id,
        staffProfileId: staff.doctor.id,
        status: AppointmentStatus.CONFIRMED,
        appointmentType: AppointmentType.FOLLOW_UP,
        scheduledAt: confirmedStart,
        endAt: addMinutes(confirmedStart, 20),
        durationMinutes: 20,
        basePrice: '55.00',
        notes: 'Blood pressure follow-up.',
        checkedInAt: null,
        completedAt: null,
    });

    const completedToday = await upsertAppointment({
        id: FIXTURE_IDS.appointmentCompletedToday,
        patientId: patients.maria.id,
        departmentId: departments.primaryCare.id,
        serviceCatalogId: services.nurseTriage.id,
        staffProfileId: staff.nurse.id,
        status: AppointmentStatus.COMPLETED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: completedStart,
        endAt: addMinutes(completedStart, 20),
        durationMinutes: 20,
        basePrice: '35.00',
        notes: 'Nurse triage and vitals completed.',
        checkedInAt: addMinutes(completedStart, -8),
        completedAt: addMinutes(completedStart, 18),
    });

    const tomorrow = await upsertAppointment({
        id: FIXTURE_IDS.appointmentTomorrow,
        patientId: patients.patient.id,
        departmentId: departments.primaryCare.id,
        serviceCatalogId: services.followUp.id,
        staffProfileId: staff.doctor.id,
        status: AppointmentStatus.CONFIRMED,
        appointmentType: AppointmentType.FOLLOW_UP,
        scheduledAt: tomorrowStart,
        endAt: addMinutes(tomorrowStart, 20),
        durationMinutes: 20,
        basePrice: '55.00',
        notes: 'Upcoming demo follow-up visible in the patient portal.',
        checkedInAt: null,
        completedAt: null,
    });

    const completedPast = await upsertAppointment({
        id: FIXTURE_IDS.appointmentCompletedPast,
        patientId: patients.patient.id,
        departmentId: departments.primaryCare.id,
        serviceCatalogId: services.generalConsultation.id,
        staffProfileId: staff.doctor.id,
        status: AppointmentStatus.COMPLETED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: pastStart,
        endAt: addMinutes(pastStart, 30),
        durationMinutes: 30,
        basePrice: '85.00',
        notes: 'Completed visit for patient portal history and feedback prompts.',
        checkedInAt: addMinutes(pastStart, -5),
        completedAt: addMinutes(pastStart, 28),
    });

    const doctorUpcoming = await upsertAppointment({
        id: FIXTURE_IDS.appointmentDoctorUpcoming,
        patientId: patients.maria.id,
        departmentId: departments.primaryCare.id,
        serviceCatalogId: services.generalConsultation.id,
        staffProfileId: staff.doctor.id,
        status: AppointmentStatus.CONFIRMED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: doctorUpcomingStart,
        endAt: addMinutes(doctorUpcomingStart, 30),
        durationMinutes: 30,
        basePrice: '85.00',
        notes: 'Upcoming seeded appointment for the demo doctor login.',
        checkedInAt: null,
        completedAt: null,
    });

    return { checkedIn, confirmed, completedToday, tomorrow, completedPast, doctorUpcoming };
}

async function upsertAppointment(input: {
    id: string;
    patientId: string;
    departmentId: string;
    serviceCatalogId: string;
    staffProfileId: string;
    status: AppointmentStatus;
    appointmentType: AppointmentType;
    scheduledAt: Date;
    endAt: Date;
    durationMinutes: number;
    basePrice: string;
    notes: string;
    checkedInAt: Date | null;
    completedAt: Date | null;
    cancelledAt?: Date | null;
    cancellationNote?: string | null;
}) {
    return prisma.appointment.upsert({
        where: { id: input.id },
        update: {
            ...input,
            cancelledAt: input.cancelledAt ?? null,
            cancellationNote: input.cancellationNote ?? null,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            ...input,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
}

const ACTIVE_SEED_APPOINTMENT_STATUSES = new Set<AppointmentStatus>([
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.IN_PROGRESS,
]);

const SCHEDULED_SEED_APPOINTMENT_STATUSES = new Set<AppointmentStatus>([
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
]);

function minutesFromUtcClock(value: Date) {
    return value.getUTCHours() * 60 + value.getUTCMinutes();
}

function rangesOverlap(
    start: Date,
    end: Date,
    blockedStart: Date,
    blockedEnd: Date,
) {
    return start < blockedEnd && end > blockedStart;
}

function timeRangesOverlap(
    start: number,
    end: number,
    blockedStart: number,
    blockedEnd: number,
) {
    return start < blockedEnd && end > blockedStart;
}

function parseScheduleTime(value: string) {
    const [hours, minutes] = value.split(':').map(Number);

    return hours * 60 + minutes;
}

async function assertSeedAppointmentIntegrity() {
    const issues: string[] = [];
    const now = new Date();
    const appointments = await prisma.appointment.findMany({
        include: {
            patient: { select: { firstName: true, lastName: true } },
            serviceCatalog: { select: { name: true, departmentId: true } },
            staffProfile: { select: { employeeCode: true } },
        },
        orderBy: [{ staffProfileId: 'asc' }, { scheduledAt: 'asc' }],
    });
    const schedules = await prisma.staffSchedule.findMany({
        where: { isActive: true },
    });
    const byStaff = new Map<string, typeof appointments>();

    for (const appointment of appointments) {
        const label = `${appointment.id} (${appointment.serviceCatalog.name}, ${appointment.scheduledAt.toISOString()})`;

        if (appointment.endAt <= appointment.scheduledAt) {
            issues.push(`${label} ends before it starts.`);
        }

        if (appointment.departmentId !== appointment.serviceCatalog.departmentId) {
            issues.push(`${label} department does not match its service catalog department.`);
        }

        if (
            ACTIVE_SEED_APPOINTMENT_STATUSES.has(appointment.status) &&
            appointment.scheduledAt <= now
        ) {
            issues.push(`${label} is an active seeded appointment in the past.`);
        }

        if (
            appointment.staffProfileId &&
            SCHEDULED_SEED_APPOINTMENT_STATUSES.has(appointment.status)
        ) {
            const day = startOfUtcDay(appointment.scheduledAt);
            const schedule = schedules.find((candidate) =>
                candidate.staffProfileId === appointment.staffProfileId &&
                candidate.departmentId === appointment.departmentId &&
                candidate.dayOfWeek === appointment.scheduledAt.getUTCDay() &&
                (!candidate.validFrom || candidate.validFrom <= day) &&
                (!candidate.validTo || candidate.validTo >= day),
            );

            if (!schedule) {
                issues.push(`${label} has no active staff schedule for that department/day.`);
            } else {
                const startMinutes = minutesFromUtcClock(appointment.scheduledAt);
                const endMinutes = minutesFromUtcClock(appointment.endAt);
                const scheduleStart = parseScheduleTime(schedule.startTime);
                const scheduleEnd = parseScheduleTime(schedule.endTime);

                if (startMinutes < scheduleStart || endMinutes > scheduleEnd) {
                    issues.push(`${label} is outside staff working hours.`);
                }

                if (schedule.breakStart && schedule.breakEnd) {
                    const breakStart = parseScheduleTime(schedule.breakStart);
                    const breakEnd = parseScheduleTime(schedule.breakEnd);

                    if (timeRangesOverlap(startMinutes, endMinutes, breakStart, breakEnd)) {
                        issues.push(`${label} overlaps a staff break.`);
                    }
                }
            }
        }

        if (
            appointment.staffProfileId &&
            appointment.status !== AppointmentStatus.CANCELLED &&
            appointment.status !== AppointmentStatus.NO_SHOW
        ) {
            const existing = byStaff.get(appointment.staffProfileId) ?? [];
            existing.push(appointment);
            byStaff.set(appointment.staffProfileId, existing);
        }
    }

    for (const [staffProfileId, staffAppointments] of byStaff.entries()) {
        const sorted = [...staffAppointments].sort(
            (left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime(),
        );

        for (let index = 1; index < sorted.length; index += 1) {
            const previous = sorted[index - 1];
            const current = sorted[index];

            if (
                rangesOverlap(
                    previous.scheduledAt,
                    previous.endAt,
                    current.scheduledAt,
                    current.endAt,
                )
            ) {
                issues.push(
                    `Staff ${staffProfileId} has overlapping seeded appointments ${previous.id} and ${current.id}.`,
                );
            }
        }
    }

    if (issues.length > 0) {
        throw new Error(
            `Seed appointment integrity check failed:\n${issues
                .map((issue) => `- ${issue}`)
                .join('\n')}`,
        );
    }

    console.log(`Seed appointment integrity check passed for ${appointments.length} appointments.`);
}

async function seedClinicalData(
    patients: Awaited<ReturnType<typeof seedPatients>>,
    staff: Awaited<ReturnType<typeof seedStaff>>,
    departmentsAndServices: Awaited<ReturnType<typeof seedDepartmentsAndServices>>,
    appointments: Awaited<ReturnType<typeof seedAppointments>>,
) {
    const recordPatient = await prisma.medicalRecord.upsert({
        where: { id: FIXTURE_IDS.medicalRecordPatient },
        update: {
            patientId: patients.patient.id,
            appointmentId: appointments.completedPast.id,
            staffProfileId: staff.doctor.id,
            departmentId: departmentsAndServices.departments.primaryCare.id,
            chiefComplaint: 'Intermittent wheezing and cough',
            vitals: {
                bloodPressure: '118/76',
                heartRate: 72,
                temperatureC: 36.8,
                oxygenSaturation: 98,
            },
            diagnosis: 'Mild intermittent asthma',
            treatmentPlan: 'Continue rescue inhaler as needed and review triggers.',
            notes: 'Symptoms controlled. No acute distress.',
            followUpInstructions: 'Return in 4 weeks or sooner if symptoms worsen.',
            isFinalized: true,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.medicalRecordPatient,
            patientId: patients.patient.id,
            appointmentId: appointments.completedPast.id,
            staffProfileId: staff.doctor.id,
            departmentId: departmentsAndServices.departments.primaryCare.id,
            chiefComplaint: 'Intermittent wheezing and cough',
            vitals: {
                bloodPressure: '118/76',
                heartRate: 72,
                temperatureC: 36.8,
                oxygenSaturation: 98,
            },
            diagnosis: 'Mild intermittent asthma',
            treatmentPlan: 'Continue rescue inhaler as needed and review triggers.',
            notes: 'Symptoms controlled. No acute distress.',
            followUpInstructions: 'Return in 4 weeks or sooner if symptoms worsen.',
            isFinalized: true,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    const recordJohn = await prisma.medicalRecord.upsert({
        where: { id: FIXTURE_IDS.medicalRecordJohn },
        update: {
            patientId: patients.john.id,
            appointmentId: appointments.confirmed.id,
            staffProfileId: staff.doctor.id,
            departmentId: departmentsAndServices.departments.primaryCare.id,
            chiefComplaint: 'Blood pressure review',
            vitals: {
                bloodPressure: '132/84',
                heartRate: 80,
                temperatureC: 36.7,
            },
            diagnosis: 'Hypertension follow-up',
            treatmentPlan: 'Continue lifestyle adjustments and home monitoring.',
            notes: 'Medication adherence reviewed.',
            followUpInstructions: 'Bring home BP log to next visit.',
            isFinalized: false,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.medicalRecordJohn,
            patientId: patients.john.id,
            appointmentId: appointments.confirmed.id,
            staffProfileId: staff.doctor.id,
            departmentId: departmentsAndServices.departments.primaryCare.id,
            chiefComplaint: 'Blood pressure review',
            vitals: {
                bloodPressure: '132/84',
                heartRate: 80,
                temperatureC: 36.7,
            },
            diagnosis: 'Hypertension follow-up',
            treatmentPlan: 'Continue lifestyle adjustments and home monitoring.',
            notes: 'Medication adherence reviewed.',
            followUpInstructions: 'Bring home BP log to next visit.',
            isFinalized: false,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    return { recordPatient, recordJohn };
}

async function seedPrescriptionsAndPharmacy(
    patients: Awaited<ReturnType<typeof seedPatients>>,
    staff: Awaited<ReturnType<typeof seedStaff>>,
    appointments: Awaited<ReturnType<typeof seedAppointments>>,
    clinicalData: Awaited<ReturnType<typeof seedClinicalData>>,
    inventory: Awaited<ReturnType<typeof seedInventory>>,
) {
    const prescription = await prisma.prescription.upsert({
        where: { id: FIXTURE_IDS.prescriptionPatient },
        update: {
            patientId: patients.patient.id,
            medicalRecordId: clinicalData.recordPatient.id,
            appointmentId: appointments.completedPast.id,
            staffProfileId: staff.doctor.id,
            issuedAt: utcAt(-1, 14, 35),
            expiresAt: utcAt(29, 23, 59),
            notes: 'Use only if bacterial sinus symptoms develop after physician review.',
            isVoided: false,
            voidedAt: null,
            voidReason: null,
            voidedByUserId: null,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.prescriptionPatient,
            patientId: patients.patient.id,
            medicalRecordId: clinicalData.recordPatient.id,
            appointmentId: appointments.completedPast.id,
            staffProfileId: staff.doctor.id,
            issuedAt: utcAt(-1, 14, 35),
            expiresAt: utcAt(29, 23, 59),
            notes: 'Use only if bacterial sinus symptoms develop after physician review.',
            isVoided: false,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    const item = await prisma.prescriptionItem.upsert({
        where: { id: FIXTURE_IDS.prescriptionItemPatient },
        update: {
            prescriptionId: prescription.id,
            medicationName: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: 'Three times daily',
            durationInstructions: '5 days',
            quantityPrescribed: 15,
            quantityDispensed: 0,
            notes: 'Dispense only if prescription is activated.',
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.prescriptionItemPatient,
            prescriptionId: prescription.id,
            medicationName: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: 'Three times daily',
            durationInstructions: '5 days',
            quantityPrescribed: 15,
            quantityDispensed: 0,
            notes: 'Dispense only if prescription is activated.',
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    const queueItem = await prisma.pharmacyQueue.upsert({
        where: { id: FIXTURE_IDS.pharmacyQueuePatient },
        update: {
            prescriptionId: prescription.id,
            patientId: patients.patient.id,
            status: PharmacyStatus.PENDING,
            requestedAt: utcAt(-1, 14, 40),
            processedAt: null,
            notes: 'Demo pharmacy item ready for queue testing.',
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.pharmacyQueuePatient,
            prescriptionId: prescription.id,
            patientId: patients.patient.id,
            status: PharmacyStatus.PENDING,
            requestedAt: utcAt(-1, 14, 40),
            notes: 'Demo pharmacy item ready for queue testing.',
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    await prisma.pharmacyDispensingItem.upsert({
        where: { id: FIXTURE_IDS.pharmacyDispensingItem },
        update: {
            pharmacyQueueId: queueItem.id,
            prescriptionItemId: item.id,
            inventoryItemId: inventory.amoxicillin.id,
            quantityToDispense: 15,
            quantityDispensed: null,
            status: PharmacyStatus.PENDING,
            notes: 'Demo dispensing row linked to amoxicillin inventory.',
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.pharmacyDispensingItem,
            pharmacyQueueId: queueItem.id,
            prescriptionItemId: item.id,
            inventoryItemId: inventory.amoxicillin.id,
            quantityToDispense: 15,
            quantityDispensed: null,
            status: PharmacyStatus.PENDING,
            notes: 'Demo dispensing row linked to amoxicillin inventory.',
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    return { prescription, item, queueItem };
}

async function seedLabOrders(
    patients: Awaited<ReturnType<typeof seedPatients>>,
    staff: Awaited<ReturnType<typeof seedStaff>>,
    departmentsAndServices: Awaited<ReturnType<typeof seedDepartmentsAndServices>>,
    appointments: Awaited<ReturnType<typeof seedAppointments>>,
    clinicalData: Awaited<ReturnType<typeof seedClinicalData>>,
) {
    const [cbc, bmp] = await Promise.all([
        prisma.labTest.findUniqueOrThrow({ where: { code: 'CBC' } }),
        prisma.labTest.findUniqueOrThrow({ where: { code: 'BMP' } }),
    ]);

    await prisma.labOrder.upsert({
        where: { id: FIXTURE_IDS.labOrderReview },
        update: {
            patientId: patients.patient.id,
            appointmentId: appointments.completedPast.id,
            medicalRecordId: clinicalData.recordPatient.id,
            orderedByStaffId: staff.doctor.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.COMPLETED,
            priority: 'normal',
            notes: 'Completed demo CBC awaiting physician review.',
            orderedAt: utcAt(-1, 14, 30),
            collectedAt: utcAt(-1, 14, 50),
            completedAt: utcAt(-1, 16, 10),
            reviewedAt: null,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.labOrderReview,
            patientId: patients.patient.id,
            appointmentId: appointments.completedPast.id,
            medicalRecordId: clinicalData.recordPatient.id,
            orderedByStaffId: staff.doctor.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.COMPLETED,
            priority: 'normal',
            notes: 'Completed demo CBC awaiting physician review.',
            orderedAt: utcAt(-1, 14, 30),
            collectedAt: utcAt(-1, 14, 50),
            completedAt: utcAt(-1, 16, 10),
            reviewedAt: null,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    await upsertLabOrderItem({
        id: '51000000-0000-4000-8000-000000000001',
        labOrderId: FIXTURE_IDS.labOrderReview,
        labTestId: cbc.id,
        resultValue: '13.4',
        resultUnit: 'g/dL',
        resultNotes: 'Within expected range.',
        resultStatus: LabResultStatus.ENTERED,
        isCritical: false,
        completedAt: utcAt(-1, 16, 10),
    });

    await prisma.labOrder.upsert({
        where: { id: FIXTURE_IDS.labOrderActive },
        update: {
            patientId: patients.john.id,
            appointmentId: appointments.confirmed.id,
            medicalRecordId: clinicalData.recordJohn.id,
            orderedByStaffId: staff.doctor.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.PENDING,
            priority: 'urgent',
            notes: 'Demo BMP pending collection.',
            orderedAt: utcAt(0, 10, 45),
            collectedAt: null,
            completedAt: null,
            reviewedAt: null,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.labOrderActive,
            patientId: patients.john.id,
            appointmentId: appointments.confirmed.id,
            medicalRecordId: clinicalData.recordJohn.id,
            orderedByStaffId: staff.doctor.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.PENDING,
            priority: 'urgent',
            notes: 'Demo BMP pending collection.',
            orderedAt: utcAt(0, 10, 45),
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    await upsertLabOrderItem({
        id: '51000000-0000-4000-8000-000000000002',
        labOrderId: FIXTURE_IDS.labOrderActive,
        labTestId: bmp.id,
        resultValue: null,
        resultUnit: null,
        resultNotes: null,
        resultStatus: LabResultStatus.PENDING,
        isCritical: false,
        completedAt: null,
    });
}

async function upsertLabOrderItem(input: {
    id: string;
    labOrderId: string;
    labTestId: string;
    resultValue: string | null;
    resultUnit: string | null;
    resultNotes: string | null;
    resultStatus: LabResultStatus;
    isCritical: boolean;
    completedAt: Date | null;
}) {
    return prisma.labOrderItem.upsert({
        where: { id: input.id },
        update: {
            ...input,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            ...input,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
}

async function seedBilling(
    patients: Awaited<ReturnType<typeof seedPatients>>,
    appointments: Awaited<ReturnType<typeof seedAppointments>>,
    departmentsAndServices: Awaited<ReturnType<typeof seedDepartmentsAndServices>>,
    inventory: Awaited<ReturnType<typeof seedInventory>>,
) {
    const paid = await prisma.billing.upsert({
        where: { id: FIXTURE_IDS.billingPaid },
        update: {
            patientId: patients.patient.id,
            appointmentId: appointments.completedPast.id,
            billingNumber: 'BILL-DEMO-0001',
            status: BillingStatus.PAID,
            subtotal: '85.00',
            taxAmount: '0.00',
            discountAmount: '0.00',
            totalAmount: '85.00',
            amountPaid: '85.00',
            dueDate: utcAt(7, 0, 0),
            issuedAt: utcAt(0, 9, 0),
            paidAt: utcAt(0, 9, 20),
            notes: 'Demo paid bill for dashboard revenue.',
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.billingPaid,
            patientId: patients.patient.id,
            appointmentId: appointments.completedPast.id,
            billingNumber: 'BILL-DEMO-0001',
            status: BillingStatus.PAID,
            subtotal: '85.00',
            taxAmount: '0.00',
            discountAmount: '0.00',
            totalAmount: '85.00',
            amountPaid: '85.00',
            dueDate: utcAt(7, 0, 0),
            issuedAt: utcAt(0, 9, 0),
            paidAt: utcAt(0, 9, 20),
            notes: 'Demo paid bill for dashboard revenue.',
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    await prisma.billingItem.upsert({
        where: { id: FIXTURE_IDS.billingPaidItem },
        update: {
            billingId: paid.id,
            serviceCatalogId: departmentsAndServices.services.generalConsultation.id,
            inventoryItemId: null,
            description: 'General Consultation',
            quantity: '1',
            unitPrice: '85.00',
            totalPrice: '85.00',
            sourceEntityType: 'appointment',
            sourceEntityId: appointments.completedPast.id,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.billingPaidItem,
            billingId: paid.id,
            serviceCatalogId: departmentsAndServices.services.generalConsultation.id,
            inventoryItemId: null,
            description: 'General Consultation',
            quantity: '1',
            unitPrice: '85.00',
            totalPrice: '85.00',
            sourceEntityType: 'appointment',
            sourceEntityId: appointments.completedPast.id,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    await prisma.payment.upsert({
        where: { id: FIXTURE_IDS.paymentPaid },
        update: {
            billingId: paid.id,
            amount: '85.00',
            paymentMethod: PaymentMethod.CARD,
            referenceNumber: 'PAY-DEMO-0001',
            paidAt: utcAt(0, 9, 20),
            receivedByUserId: DEMO_USER_IDS.receptionist,
            notes: 'Demo card payment.',
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.paymentPaid,
            billingId: paid.id,
            amount: '85.00',
            paymentMethod: PaymentMethod.CARD,
            referenceNumber: 'PAY-DEMO-0001',
            paidAt: utcAt(0, 9, 20),
            receivedByUserId: DEMO_USER_IDS.receptionist,
            notes: 'Demo card payment.',
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    const pending = await prisma.billing.upsert({
        where: { id: FIXTURE_IDS.billingPending },
        update: {
            patientId: patients.john.id,
            appointmentId: appointments.confirmed.id,
            billingNumber: 'BILL-DEMO-0002',
            status: BillingStatus.PENDING,
            subtotal: '59.25',
            taxAmount: '0.00',
            discountAmount: '0.00',
            totalAmount: '59.25',
            amountPaid: '0.00',
            dueDate: utcAt(14, 0, 0),
            issuedAt: utcAt(0, 11, 0),
            paidAt: null,
            notes: 'Demo pending bill for receptionist workflow.',
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.billingPending,
            patientId: patients.john.id,
            appointmentId: appointments.confirmed.id,
            billingNumber: 'BILL-DEMO-0002',
            status: BillingStatus.PENDING,
            subtotal: '59.25',
            taxAmount: '0.00',
            discountAmount: '0.00',
            totalAmount: '59.25',
            amountPaid: '0.00',
            dueDate: utcAt(14, 0, 0),
            issuedAt: utcAt(0, 11, 0),
            notes: 'Demo pending bill for receptionist workflow.',
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    await prisma.billingItem.upsert({
        where: { id: FIXTURE_IDS.billingPendingItem },
        update: {
            billingId: pending.id,
            serviceCatalogId: departmentsAndServices.services.followUp.id,
            inventoryItemId: inventory.cbcKits.id,
            description: 'Follow-up Consultation and CBC kit',
            quantity: '1',
            unitPrice: '59.25',
            totalPrice: '59.25',
            sourceEntityType: 'appointment',
            sourceEntityId: appointments.confirmed.id,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.billingPendingItem,
            billingId: pending.id,
            serviceCatalogId: departmentsAndServices.services.followUp.id,
            inventoryItemId: inventory.cbcKits.id,
            description: 'Follow-up Consultation and CBC kit',
            quantity: '1',
            unitPrice: '59.25',
            totalPrice: '59.25',
            sourceEntityType: 'appointment',
            sourceEntityId: appointments.confirmed.id,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
}

async function seedFeedbackAndOperations(
    patients: Awaited<ReturnType<typeof seedPatients>>,
    appointments: Awaited<ReturnType<typeof seedAppointments>>,
) {
    await prisma.feedback.upsert({
        where: { id: FIXTURE_IDS.feedbackJohn },
        update: {
            patientId: patients.maria.id,
            appointmentId: appointments.completedToday.id,
            rating: 5,
            comment: 'Friendly staff and very fast triage.',
            status: 'published',
            isAnonymous: false,
            submittedAt: utcAt(0, 12, 15),
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.feedbackJohn,
            patientId: patients.maria.id,
            appointmentId: appointments.completedToday.id,
            rating: 5,
            comment: 'Friendly staff and very fast triage.',
            status: 'published',
            isAnonymous: false,
            submittedAt: utcAt(0, 12, 15),
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    await prisma.contactMessage.upsert({
        where: { id: FIXTURE_IDS.contactMessage },
        update: {
            name: 'Demo Visitor',
            email: 'visitor@example.local',
            phone: '+1 555 0199',
            subject: 'Question about clinic hours',
            message: 'Can I book lab work before my morning appointment?',
            status: 'new',
            replyNotes: null,
            repliedAt: null,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: FIXTURE_IDS.contactMessage,
            name: 'Demo Visitor',
            email: 'visitor@example.local',
            phone: '+1 555 0199',
            subject: 'Question about clinic hours',
            message: 'Can I book lab work before my morning appointment?',
            status: 'new',
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    await prisma.auditLog.upsert({
        where: { id: FIXTURE_IDS.auditLog },
        update: {
            entityType: 'seed',
            entityId: 'demo-fixture',
            action: 'demo.seed.refreshed',
            performedByUserId: ACTOR_USER_ID,
            ipAddress: '127.0.0.1',
            userAgent: 'MedSphere seed',
            oldValue: Prisma.JsonNull,
            newValue: {
                demoUsers: Object.values(DEMO_USER_IDS).length,
                patients: 3,
            },
            requestId: 'seed-demo',
            metadata: {
                source: 'prisma/seed.ts',
            },
        },
        create: {
            id: FIXTURE_IDS.auditLog,
            entityType: 'seed',
            entityId: 'demo-fixture',
            action: 'demo.seed.refreshed',
            performedByUserId: ACTOR_USER_ID,
            ipAddress: '127.0.0.1',
            userAgent: 'MedSphere seed',
            oldValue: Prisma.JsonNull,
            newValue: {
                demoUsers: Object.values(DEMO_USER_IDS).length,
                patients: 3,
            },
            requestId: 'seed-demo',
            metadata: {
                source: 'prisma/seed.ts',
            },
        },
    });
}

async function seedExpandedDemoData(
    departmentsAndServices: Awaited<ReturnType<typeof seedDepartmentsAndServices>>,
    staff: Awaited<ReturnType<typeof seedStaff>>,
    patients: Awaited<ReturnType<typeof seedPatients>>,
    inventory: Awaited<ReturnType<typeof seedInventory>>,
    appointments: Awaited<ReturnType<typeof seedAppointments>>,
    clinicalData: Awaited<ReturnType<typeof seedClinicalData>>,
) {
    const cardiology = await upsertDepartment({
        name: 'Cardiology',
        description: 'Preventive cardiology, ECG review, and chronic heart-care follow-up',
        floor: '2',
        phoneExtension: '210',
        operatingHours: { weekdays: '08:00-17:00' },
        sortOrder: 4,
    });
    const pediatrics = await upsertDepartment({
        name: 'Pediatrics',
        description: 'Child wellness, vaccinations, and pediatric acute visits',
        floor: '1',
        phoneExtension: '120',
        operatingHours: { weekdays: '08:30-17:30', saturday: '09:00-13:00' },
        sortOrder: 5,
    });
    const emergency = await upsertDepartment({
        name: 'Emergency & Triage',
        description: 'Walk-in urgent assessment and fast-track clinical triage',
        floor: 'G',
        phoneExtension: '911',
        operatingHours: { daily: '00:00-24:00' },
        sortOrder: 6,
    });
    const radiology = await upsertDepartment({
        name: 'Radiology',
        description: 'X-ray, ultrasound, and imaging coordination',
        floor: '2',
        phoneExtension: '220',
        operatingHours: { weekdays: '08:00-16:00' },
        sortOrder: 7,
    });
    const billingAdmin = await upsertDepartment({
        name: 'Billing & Administration',
        description: 'Clinic administration, insurance support, and billing desk',
        floor: '1',
        phoneExtension: '140',
        operatingHours: { weekdays: '08:00-18:00' },
        sortOrder: 8,
    });
    const neurology = await upsertDepartment({
        name: 'Neurology',
        description: 'Headache, seizure, neuropathy, and neurologic follow-up care',
        floor: '3',
        phoneExtension: '230',
        operatingHours: { weekdays: '08:00-17:00' },
        sortOrder: 9,
    });
    const dermatology = await upsertDepartment({
        name: 'Dermatology',
        description: 'Skin checks, acne, rashes, and minor dermatologic procedures',
        floor: '2',
        phoneExtension: '240',
        operatingHours: { weekdays: '09:00-17:00' },
        sortOrder: 10,
    });
    const orthopedics = await upsertDepartment({
        name: 'Orthopedics',
        description: 'Joint pain, fractures, sports medicine, and musculoskeletal care',
        floor: '3',
        phoneExtension: '250',
        operatingHours: { weekdays: '08:30-17:30' },
        sortOrder: 11,
    });
    const womensHealth = await upsertDepartment({
        name: "Women's Health",
        description: "Gynecology, prenatal counseling, and preventive women's health visits",
        floor: '2',
        phoneExtension: '260',
        operatingHours: { weekdays: '08:30-17:30', saturday: '09:00-12:00' },
        sortOrder: 12,
    });
    const mentalHealth = await upsertDepartment({
        name: 'Mental Health',
        description: 'Counseling, psychiatry follow-up, and behavioral-health support',
        floor: '3',
        phoneExtension: '270',
        operatingHours: { weekdays: '09:00-18:00' },
        sortOrder: 13,
    });
    const dental = await upsertDepartment({
        name: 'Dental Care',
        description: 'Preventive dentistry, dental pain visits, and oral-health care plans',
        floor: '1',
        phoneExtension: '280',
        operatingHours: { weekdays: '08:00-16:00' },
        sortOrder: 14,
    });
    const ophthalmology = await upsertDepartment({
        name: 'Ophthalmology',
        description: 'Eye exams, retinal screening, and vision-care referrals',
        floor: '2',
        phoneExtension: '290',
        operatingHours: { weekdays: '08:00-16:30' },
        sortOrder: 15,
    });
    const endocrinology = await upsertDepartment({
        name: 'Endocrinology',
        description: 'Diabetes, thyroid, and metabolic condition management',
        floor: '3',
        phoneExtension: '310',
        operatingHours: { weekdays: '08:00-17:00' },
        sortOrder: 16,
    });
    const rehabilitation = await upsertDepartment({
        name: 'Rehabilitation & Physical Therapy',
        description: 'Physical therapy, post-injury rehabilitation, and mobility plans',
        floor: 'G',
        phoneExtension: '320',
        operatingHours: { weekdays: '07:30-18:30' },
        sortOrder: 17,
    });
    const oncology = await upsertDepartment({
        name: 'Oncology',
        description: 'Cancer screening coordination, survivorship follow-up, and referral care',
        floor: '4',
        phoneExtension: '330',
        operatingHours: { weekdays: '08:30-16:30' },
        sortOrder: 18,
    });

    const vaccination = await upsertService(
        departmentsAndServices.departments.primaryCare.id,
        'Vaccination Visit',
        'Routine vaccine administration and observation',
        20,
        '40.00',
        4,
    );
    const cardiologyConsult = await upsertService(
        cardiology.id,
        'Cardiology Consultation',
        'Specialist cardiovascular evaluation',
        40,
        '140.00',
        1,
    );
    const ecg = await upsertService(
        cardiology.id,
        'ECG',
        'Resting 12-lead electrocardiogram',
        20,
        '65.00',
        2,
    );
    const pediatricConsult = await upsertService(
        pediatrics.id,
        'Pediatric Consultation',
        'General child health visit',
        30,
        '95.00',
        1,
    );
    const childWellness = await upsertService(
        pediatrics.id,
        'Child Wellness Check',
        'Growth, development, and immunization review',
        30,
        '80.00',
        2,
    );
    const sampleCollection = await upsertService(
        departmentsAndServices.departments.diagnostics.id,
        'Sample Collection',
        'Blood, urine, or swab sample collection',
        15,
        '25.00',
        2,
    );
    const urgentAssessment = await upsertService(
        emergency.id,
        'Urgent Walk-in Assessment',
        'Fast-track triage and acute assessment',
        30,
        '120.00',
        1,
    );
    const minorProcedure = await upsertService(
        emergency.id,
        'Minor Procedure',
        'Small wound, dressing, or minor intervention visit',
        30,
        '110.00',
        2,
    );
    const xray = await upsertService(
        radiology.id,
        'X-Ray Imaging',
        'Plain film imaging with radiology report',
        25,
        '75.00',
        1,
    );
    const ultrasound = await upsertService(
        radiology.id,
        'Ultrasound Scan',
        'Focused ultrasound imaging appointment',
        35,
        '130.00',
        2,
    );
    const medicationCounseling = await upsertService(
        departmentsAndServices.departments.pharmacy.id,
        'Medication Counseling',
        'Pharmacist review of medication use and safety',
        20,
        '30.00',
        1,
    );
    const insuranceVerification = await upsertService(
        billingAdmin.id,
        'Insurance Verification',
        'Coverage check and billing eligibility support',
        20,
        '20.00',
        1,
    );
    const billingConsultation = await upsertService(
        billingAdmin.id,
        'Billing Consultation',
        'Patient billing explanation and payment-plan support',
        20,
        '15.00',
        2,
    );
    const migraineConsult = await upsertService(
        neurology.id,
        'Migraine & Headache Consultation',
        'Neurologic review for recurrent headache and migraine care',
        40,
        '135.00',
        1,
    );
    const seizureFollowUp = await upsertService(
        neurology.id,
        'Seizure Follow-up',
        'Medication and symptom review for seizure disorders',
        35,
        '125.00',
        2,
    );
    const skinCheck = await upsertService(
        dermatology.id,
        'Full Skin Check',
        'Preventive dermatology exam and lesion review',
        30,
        '105.00',
        1,
    );
    const acneCare = await upsertService(
        dermatology.id,
        'Acne & Rash Visit',
        'Dermatology visit for acne, eczema, or rash care',
        25,
        '85.00',
        2,
    );
    const orthopedicConsult = await upsertService(
        orthopedics.id,
        'Orthopedic Consultation',
        'Joint, bone, and sports-injury assessment',
        35,
        '130.00',
        1,
    );
    const fractureFollowUp = await upsertService(
        orthopedics.id,
        'Fracture Follow-up',
        'Post-injury review and immobilization follow-up',
        25,
        '90.00',
        2,
    );
    const gynecologyVisit = await upsertService(
        womensHealth.id,
        'Gynecology Visit',
        "Preventive women's health and gynecology appointment",
        35,
        '120.00',
        1,
    );
    const prenatalCounseling = await upsertService(
        womensHealth.id,
        'Prenatal Counseling',
        'Early pregnancy counseling and care planning',
        40,
        '140.00',
        2,
    );
    const therapySession = await upsertService(
        mentalHealth.id,
        'Therapy Session',
        'Behavioral-health counseling session',
        50,
        '115.00',
        1,
    );
    const psychiatryFollowUp = await upsertService(
        mentalHealth.id,
        'Psychiatry Follow-up',
        'Medication and mental-health treatment review',
        30,
        '125.00',
        2,
    );
    const dentalCleaning = await upsertService(
        dental.id,
        'Dental Cleaning',
        'Preventive dental cleaning and oral-health check',
        40,
        '95.00',
        1,
    );
    const dentalPainVisit = await upsertService(
        dental.id,
        'Dental Pain Visit',
        'Urgent dental assessment for tooth or gum pain',
        30,
        '110.00',
        2,
    );
    const eyeExam = await upsertService(
        ophthalmology.id,
        'Comprehensive Eye Exam',
        'Vision, pressure, and eye-health screening',
        35,
        '100.00',
        1,
    );
    const retinalScreening = await upsertService(
        ophthalmology.id,
        'Retinal Screening',
        'Retinal imaging and diabetic eye screening workflow',
        25,
        '115.00',
        2,
    );
    const diabetesConsult = await upsertService(
        endocrinology.id,
        'Diabetes Management Visit',
        'Glucose, medication, and lifestyle-management review',
        40,
        '135.00',
        1,
    );
    const thyroidConsult = await upsertService(
        endocrinology.id,
        'Thyroid Consultation',
        'Thyroid lab review and treatment planning',
        35,
        '125.00',
        2,
    );
    const physicalTherapyEval = await upsertService(
        rehabilitation.id,
        'Physical Therapy Evaluation',
        'Initial rehabilitation evaluation and movement plan',
        45,
        '105.00',
        1,
    );
    const rehabFollowUp = await upsertService(
        rehabilitation.id,
        'Rehabilitation Follow-up',
        'Follow-up physical therapy session',
        30,
        '75.00',
        2,
    );
    const oncologyFollowUp = await upsertService(
        oncology.id,
        'Oncology Follow-up',
        'Cancer-care follow-up and symptom review',
        40,
        '160.00',
        1,
    );
    const cancerScreening = await upsertService(
        oncology.id,
        'Cancer Screening Coordination',
        'Screening coordination and referral planning',
        30,
        '95.00',
        2,
    );

    const [
        administratorType,
        doctorType,
        nurseType,
        receptionistType,
        labTechnicianType,
        pharmacistType,
    ] = await Promise.all([
        prisma.staffPositionType.findUniqueOrThrow({ where: { name: 'Administrator' } }),
        prisma.staffPositionType.findUniqueOrThrow({ where: { name: 'Doctor' } }),
        prisma.staffPositionType.findUniqueOrThrow({ where: { name: 'Nurse' } }),
        prisma.staffPositionType.findUniqueOrThrow({ where: { name: 'Receptionist' } }),
        prisma.staffPositionType.findUniqueOrThrow({ where: { name: 'Lab Technician' } }),
        prisma.staffPositionType.findUniqueOrThrow({ where: { name: 'Pharmacist' } }),
    ]);

    const clinicAdmin = await upsertStaffProfile({
        id: DEMO_USER_IDS.clinicAdmin,
        userId: DEMO_USER_IDS.clinicAdmin,
        staffPositionTypeId: administratorType.id,
        employeeCode: 'Daniel Okafor',
        specialization: 'Clinic Operations',
        licenseNumber: null,
        hireDate: dateOnly('2021-09-01'),
        bio: 'Daniel Okafor coordinates service operations, billing readiness, and cross-team coverage.',
        isPublicProfile: false,
    });
    const cardiologist = await upsertStaffProfile({
        id: DEMO_USER_IDS.cardiologist,
        userId: DEMO_USER_IDS.cardiologist,
        staffPositionTypeId: doctorType.id,
        employeeCode: 'Dr. Youssef Benali',
        specialization: 'Cardiology',
        licenseNumber: 'MD-CARD-2041',
        hireDate: dateOnly('2020-04-20'),
        bio: 'Dr. Youssef Benali focuses on preventive cardiology, chest-pain follow-up, and ECG interpretation.',
        isPublicProfile: true,
    });
    const pediatrician = await upsertStaffProfile({
        id: DEMO_USER_IDS.pediatrician,
        userId: DEMO_USER_IDS.pediatrician,
        staffPositionTypeId: doctorType.id,
        employeeCode: 'Dr. Sofia Kovalenko',
        specialization: 'Pediatrics',
        licenseNumber: 'MD-PEDS-3188',
        hireDate: dateOnly('2019-06-17'),
        bio: 'Dr. Sofia Kovalenko provides pediatric wellness, immunization planning, and acute child visits.',
        isPublicProfile: true,
    });
    const emergencyNurse = await upsertStaffProfile({
        id: DEMO_USER_IDS.emergencyNurse,
        userId: DEMO_USER_IDS.emergencyNurse,
        staffPositionTypeId: nurseType.id,
        employeeCode: 'Nurse Mei Tanaka',
        specialization: 'Emergency Triage',
        licenseNumber: 'RN-ER-2207',
        hireDate: dateOnly('2022-11-07'),
        bio: 'Mei Tanaka handles urgent intake, escalation, and fast-track triage workflows.',
        isPublicProfile: true,
    });
    const labTechnician = await upsertStaffProfile({
        id: DEMO_USER_IDS.labTechnician,
        userId: DEMO_USER_IDS.labTechnician,
        staffPositionTypeId: labTechnicianType.id,
        employeeCode: 'Kwame Mensah',
        specialization: 'Clinical Laboratory',
        licenseNumber: 'MLT-4402',
        hireDate: dateOnly('2023-03-03'),
        bio: 'Kwame Mensah processes hematology, chemistry, and rapid diagnostic testing.',
        isPublicProfile: false,
    });
    const pharmacist = await upsertStaffProfile({
        id: DEMO_USER_IDS.pharmacist,
        userId: DEMO_USER_IDS.pharmacist,
        staffPositionTypeId: pharmacistType.id,
        employeeCode: 'Leila Haddad',
        specialization: 'Clinical Pharmacy',
        licenseNumber: 'RPH-7015',
        hireDate: dateOnly('2022-05-16'),
        bio: 'Leila Haddad manages dispensing, medication counseling, and pharmacy stock safety.',
        isPublicProfile: false,
    });

    const additionalStaffFixtures = [
        {
            key: 'neurologistAmina',
            id: fixtureUuid('b2000000', 1),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Amina El-Sayed',
            specialization: 'Neurology',
            licenseNumber: 'MD-NEUR-5101',
            hireDate: dateOnly('2018-02-12'),
            bio: 'Dr. Amina El-Sayed treats migraine, neuropathy, and seizure follow-up with a calm, patient-centered approach.',
            isPublicProfile: true,
            departments: [{ departmentId: neurology.id, isPrimary: true }],
            schedule: { departmentId: neurology.id, startTime: '08:00', endTime: '16:00' },
        },
        {
            key: 'neurologistLars',
            id: fixtureUuid('b2000000', 2),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Lars Nordin',
            specialization: 'Neurophysiology',
            licenseNumber: 'MD-NEUR-5102',
            hireDate: dateOnly('2019-05-22'),
            bio: 'Dr. Lars Nordin focuses on neurophysiology, dizziness, and complex neurologic symptom review.',
            isPublicProfile: true,
            departments: [{ departmentId: neurology.id, isPrimary: true }],
            schedule: { departmentId: neurology.id, startTime: '10:00', endTime: '18:00' },
        },
        {
            key: 'dermatologistNia',
            id: fixtureUuid('b2000000', 3),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Nia Mensah',
            specialization: 'Dermatology',
            licenseNumber: 'MD-DERM-5201',
            hireDate: dateOnly('2020-01-13'),
            bio: 'Dr. Nia Mensah provides preventive skin checks, acne care, eczema review, and minor skin procedures.',
            isPublicProfile: true,
            departments: [{ departmentId: dermatology.id, isPrimary: true }],
            schedule: { departmentId: dermatology.id, startTime: '09:00', endTime: '17:00' },
        },
        {
            key: 'dermatologistHiro',
            id: fixtureUuid('b2000000', 4),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Hiro Yamamoto',
            specialization: 'Dermatologic Surgery',
            licenseNumber: 'MD-DERM-5202',
            hireDate: dateOnly('2021-04-07'),
            bio: 'Dr. Hiro Yamamoto supports lesion review, biopsy planning, and outpatient dermatologic procedures.',
            isPublicProfile: true,
            departments: [{ departmentId: dermatology.id, isPrimary: true }],
            schedule: { departmentId: dermatology.id, startTime: '08:30', endTime: '16:30' },
        },
        {
            key: 'orthopedistMateusz',
            id: fixtureUuid('b2000000', 5),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Mateusz Kowalski',
            specialization: 'Orthopedics',
            licenseNumber: 'MD-ORTH-5301',
            hireDate: dateOnly('2017-10-02'),
            bio: 'Dr. Mateusz Kowalski manages sports injuries, fracture follow-up, and joint-pain care.',
            isPublicProfile: true,
            departments: [{ departmentId: orthopedics.id, isPrimary: true }],
            schedule: { departmentId: orthopedics.id, startTime: '08:00', endTime: '16:00' },
        },
        {
            key: 'orthopedistValentina',
            id: fixtureUuid('b2000000', 6),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Valentina Rossi',
            specialization: 'Sports Medicine',
            licenseNumber: 'MD-ORTH-5302',
            hireDate: dateOnly('2020-09-14'),
            bio: 'Dr. Valentina Rossi focuses on sports medicine, mobility recovery, and active-lifestyle injuries.',
            isPublicProfile: true,
            departments: [
                { departmentId: orthopedics.id, isPrimary: true },
                { departmentId: rehabilitation.id, isPrimary: false },
            ],
            schedule: { departmentId: orthopedics.id, startTime: '10:00', endTime: '18:00' },
        },
        {
            key: 'gynecologistMariam',
            id: fixtureUuid('b2000000', 7),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Mariam Al-Khatib',
            specialization: 'Gynecology',
            licenseNumber: 'MD-GYN-5401',
            hireDate: dateOnly('2018-06-18'),
            bio: 'Dr. Mariam Al-Khatib provides preventive gynecology, prenatal counseling, and reproductive-health visits.',
            isPublicProfile: true,
            departments: [{ departmentId: womensHealth.id, isPrimary: true }],
            schedule: { departmentId: womensHealth.id, startTime: '08:30', endTime: '16:30' },
        },
        {
            key: 'gynecologistElena',
            id: fixtureUuid('b2000000', 8),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Elena Popescu',
            specialization: 'Women\'s Health',
            licenseNumber: 'MD-GYN-5402',
            hireDate: dateOnly('2022-03-21'),
            bio: 'Dr. Elena Popescu supports prenatal counseling, preventive screening, and women\'s health follow-up.',
            isPublicProfile: true,
            departments: [{ departmentId: womensHealth.id, isPrimary: true }],
            schedule: { departmentId: womensHealth.id, startTime: '10:00', endTime: '18:00' },
        },
        {
            key: 'psychiatristRavi',
            id: fixtureUuid('b2000000', 9),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Ravi Menon',
            specialization: 'Psychiatry',
            licenseNumber: 'MD-PSY-5501',
            hireDate: dateOnly('2016-12-05'),
            bio: 'Dr. Ravi Menon provides psychiatry follow-up, medication review, and behavioral-health care planning.',
            isPublicProfile: true,
            departments: [{ departmentId: mentalHealth.id, isPrimary: true }],
            schedule: { departmentId: mentalHealth.id, startTime: '09:00', endTime: '17:00' },
        },
        {
            key: 'therapistCamila',
            id: fixtureUuid('b2000000', 10),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Camila Torres',
            specialization: 'Behavioral Health',
            licenseNumber: 'PSY-5502',
            hireDate: dateOnly('2021-01-25'),
            bio: 'Dr. Camila Torres offers therapy visits, anxiety support, and continuity counseling.',
            isPublicProfile: true,
            departments: [{ departmentId: mentalHealth.id, isPrimary: true }],
            schedule: { departmentId: mentalHealth.id, startTime: '11:00', endTime: '19:00' },
        },
        {
            key: 'dentistSantiago',
            id: fixtureUuid('b2000000', 11),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Santiago Alvarez',
            specialization: 'Dentistry',
            licenseNumber: 'DDS-5601',
            hireDate: dateOnly('2019-11-19'),
            bio: 'Dr. Santiago Alvarez provides preventive dentistry, dental-pain care, and oral-health counseling.',
            isPublicProfile: true,
            departments: [{ departmentId: dental.id, isPrimary: true }],
            schedule: { departmentId: dental.id, startTime: '08:00', endTime: '16:00' },
        },
        {
            key: 'dentistLayla',
            id: fixtureUuid('b2000000', 12),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Layla Haddad',
            specialization: 'Pediatric Dentistry',
            licenseNumber: 'DDS-5602',
            hireDate: dateOnly('2020-07-09'),
            bio: 'Dr. Layla Haddad focuses on pediatric dental visits, prevention, and gentle urgent dental care.',
            isPublicProfile: true,
            departments: [
                { departmentId: dental.id, isPrimary: true },
                { departmentId: pediatrics.id, isPrimary: false },
            ],
            schedule: { departmentId: dental.id, startTime: '09:00', endTime: '17:00' },
        },
        {
            key: 'ophthalmologistIbrahim',
            id: fixtureUuid('b2000000', 13),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Ibrahim Hassan',
            specialization: 'Ophthalmology',
            licenseNumber: 'MD-OPH-5701',
            hireDate: dateOnly('2018-08-27'),
            bio: 'Dr. Ibrahim Hassan handles comprehensive eye exams, glaucoma checks, and diabetic eye screening.',
            isPublicProfile: true,
            departments: [{ departmentId: ophthalmology.id, isPrimary: true }],
            schedule: { departmentId: ophthalmology.id, startTime: '08:00', endTime: '16:00' },
        },
        {
            key: 'ophthalmologistAna',
            id: fixtureUuid('b2000000', 14),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Ana Ribeiro',
            specialization: 'Retina',
            licenseNumber: 'MD-OPH-5702',
            hireDate: dateOnly('2021-06-01'),
            bio: 'Dr. Ana Ribeiro focuses on retina review, diabetic screening, and visual-symptom triage.',
            isPublicProfile: true,
            departments: [{ departmentId: ophthalmology.id, isPrimary: true }],
            schedule: { departmentId: ophthalmology.id, startTime: '10:00', endTime: '18:00' },
        },
        {
            key: 'endocrinologistMaya',
            id: fixtureUuid('b2000000', 15),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Maya Singh',
            specialization: 'Endocrinology',
            licenseNumber: 'MD-ENDO-5801',
            hireDate: dateOnly('2017-02-20'),
            bio: 'Dr. Maya Singh supports diabetes care, thyroid review, and metabolic-health treatment planning.',
            isPublicProfile: true,
            departments: [{ departmentId: endocrinology.id, isPrimary: true }],
            schedule: { departmentId: endocrinology.id, startTime: '08:00', endTime: '16:00' },
        },
        {
            key: 'endocrinologistNoah',
            id: fixtureUuid('b2000000', 16),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Noah Stein',
            specialization: 'Diabetes Care',
            licenseNumber: 'MD-ENDO-5802',
            hireDate: dateOnly('2022-10-03'),
            bio: 'Dr. Noah Stein focuses on diabetes follow-up, medication adjustment, and prevention counseling.',
            isPublicProfile: true,
            departments: [{ departmentId: endocrinology.id, isPrimary: true }],
            schedule: { departmentId: endocrinology.id, startTime: '10:00', endTime: '18:00' },
        },
        {
            key: 'physiatristZara',
            id: fixtureUuid('b2000000', 17),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Zara Khan',
            specialization: 'Physical Medicine',
            licenseNumber: 'MD-REHAB-5901',
            hireDate: dateOnly('2019-03-11'),
            bio: 'Dr. Zara Khan coordinates rehabilitation plans, mobility recovery, and post-injury care.',
            isPublicProfile: true,
            departments: [{ departmentId: rehabilitation.id, isPrimary: true }],
            schedule: { departmentId: rehabilitation.id, startTime: '08:00', endTime: '16:00' },
        },
        {
            key: 'therapistJonas',
            id: fixtureUuid('b2000000', 18),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Jonas Bergstrom',
            specialization: 'Physical Therapy',
            licenseNumber: 'PT-5902',
            hireDate: dateOnly('2021-09-13'),
            bio: 'Jonas Bergstrom leads physical therapy follow-ups, strengthening plans, and mobility coaching.',
            isPublicProfile: true,
            departments: [{ departmentId: rehabilitation.id, isPrimary: true }],
            schedule: { departmentId: rehabilitation.id, startTime: '11:00', endTime: '19:00' },
        },
        {
            key: 'oncologistFatima',
            id: fixtureUuid('b2000000', 19),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Fatima Zahra',
            specialization: 'Oncology',
            licenseNumber: 'MD-ONC-6001',
            hireDate: dateOnly('2016-05-30'),
            bio: 'Dr. Fatima Zahra supports cancer screening coordination, survivorship review, and referral care.',
            isPublicProfile: true,
            departments: [{ departmentId: oncology.id, isPrimary: true }],
            schedule: { departmentId: oncology.id, startTime: '08:30', endTime: '16:30' },
        },
        {
            key: 'oncologistJames',
            id: fixtureUuid('b2000000', 20),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. James O\'Connor',
            specialization: 'Medical Oncology',
            licenseNumber: 'MD-ONC-6002',
            hireDate: dateOnly('2020-02-03'),
            bio: 'Dr. James O\'Connor manages oncology follow-up, symptom review, and coordinated care plans.',
            isPublicProfile: true,
            departments: [{ departmentId: oncology.id, isPrimary: true }],
            schedule: { departmentId: oncology.id, startTime: '09:30', endTime: '17:30' },
        },
        {
            key: 'cardiologistAmara',
            id: fixtureUuid('b2000000', 21),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Amara Okafor',
            specialization: 'Interventional Cardiology',
            licenseNumber: 'MD-CARD-6101',
            hireDate: dateOnly('2018-09-17'),
            bio: 'Dr. Amara Okafor provides chest-pain review, cardiac-risk counseling, and post-ECG follow-up.',
            isPublicProfile: true,
            departments: [{ departmentId: cardiology.id, isPrimary: true }],
            schedule: { departmentId: cardiology.id, startTime: '12:00', endTime: '20:00' },
        },
        {
            key: 'pediatricianMateo',
            id: fixtureUuid('b2000000', 22),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Mateo Silva',
            specialization: 'Pediatrics',
            licenseNumber: 'MD-PEDS-6201',
            hireDate: dateOnly('2021-08-16'),
            bio: 'Dr. Mateo Silva supports child wellness, pediatric acute visits, and vaccine counseling.',
            isPublicProfile: true,
            departments: [{ departmentId: pediatrics.id, isPrimary: true }],
            schedule: { departmentId: pediatrics.id, startTime: '12:00', endTime: '20:00' },
        },
        {
            key: 'primaryDoctorLeila',
            id: fixtureUuid('b2000000', 23),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Leila Farah',
            specialization: 'Family Medicine',
            licenseNumber: 'MD-PC-6301',
            hireDate: dateOnly('2020-11-02'),
            bio: 'Dr. Leila Farah provides family medicine, preventive care, and chronic-condition follow-up.',
            isPublicProfile: true,
            departments: [{ departmentId: departmentsAndServices.departments.primaryCare.id, isPrimary: true }],
            schedule: { departmentId: departmentsAndServices.departments.primaryCare.id, startTime: '10:00', endTime: '18:00' },
        },
        {
            key: 'radiologistAleksei',
            id: fixtureUuid('b2000000', 24),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Aleksei Petrov',
            specialization: 'Radiology',
            licenseNumber: 'MD-RAD-6401',
            hireDate: dateOnly('2017-04-24'),
            bio: 'Dr. Aleksei Petrov reviews imaging studies, ultrasound findings, and radiology coordination cases.',
            isPublicProfile: true,
            departments: [{ departmentId: radiology.id, isPrimary: true }],
            schedule: { departmentId: radiology.id, startTime: '08:00', endTime: '16:00' },
        },
        {
            key: 'radiologistSara',
            id: fixtureUuid('b2000000', 25),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Sara Lindgren',
            specialization: 'Diagnostic Imaging',
            licenseNumber: 'MD-RAD-6402',
            hireDate: dateOnly('2022-05-09'),
            bio: 'Dr. Sara Lindgren supports X-ray review, ultrasound reporting, and diagnostic imaging workflows.',
            isPublicProfile: true,
            departments: [{ departmentId: radiology.id, isPrimary: true }],
            schedule: { departmentId: radiology.id, startTime: '09:30', endTime: '17:30' },
        },
        {
            key: 'emergencyDoctorKenji',
            id: fixtureUuid('b2000000', 26),
            staffPositionTypeId: doctorType.id,
            employeeCode: 'Dr. Kenji Watanabe',
            specialization: 'Emergency Medicine',
            licenseNumber: 'MD-ER-6501',
            hireDate: dateOnly('2019-01-15'),
            bio: 'Dr. Kenji Watanabe manages urgent walk-ins, acute stabilization, and triage escalation.',
            isPublicProfile: true,
            departments: [{ departmentId: emergency.id, isPrimary: true }],
            schedule: { departmentId: emergency.id, startTime: '15:00', endTime: '23:00' },
        },
        {
            key: 'nurseSofia',
            id: fixtureUuid('b2000000', 27),
            staffPositionTypeId: nurseType.id,
            employeeCode: 'Nurse Sofia Martinez',
            specialization: 'Pediatrics Nursing',
            licenseNumber: 'RN-PEDS-6601',
            hireDate: dateOnly('2022-06-06'),
            bio: 'Nurse Sofia Martinez supports pediatric intake, vaccination preparation, and family education.',
            isPublicProfile: true,
            departments: [{ departmentId: pediatrics.id, isPrimary: true }],
            schedule: { departmentId: pediatrics.id, startTime: '08:00', endTime: '16:00' },
        },
        {
            key: 'nurseAmina',
            id: fixtureUuid('b2000000', 28),
            staffPositionTypeId: nurseType.id,
            employeeCode: 'Nurse Amina Diallo',
            specialization: 'Chronic Care Nursing',
            licenseNumber: 'RN-PC-6602',
            hireDate: dateOnly('2021-12-01'),
            bio: 'Nurse Amina Diallo supports chronic-care check-ins, vitals, and patient education.',
            isPublicProfile: true,
            departments: [{ departmentId: departmentsAndServices.departments.primaryCare.id, isPrimary: true }],
            schedule: { departmentId: departmentsAndServices.departments.primaryCare.id, startTime: '09:00', endTime: '17:00' },
        },
        {
            key: 'nurseNoor',
            id: fixtureUuid('b2000000', 29),
            staffPositionTypeId: nurseType.id,
            employeeCode: 'Nurse Noor Al-Farsi',
            specialization: 'Emergency Nursing',
            licenseNumber: 'RN-ER-6603',
            hireDate: dateOnly('2020-03-30'),
            bio: 'Nurse Noor Al-Farsi handles urgent triage, observation checks, and escalation support.',
            isPublicProfile: true,
            departments: [{ departmentId: emergency.id, isPrimary: true }],
            schedule: { departmentId: emergency.id, startTime: '15:00', endTime: '23:00' },
        },
        {
            key: 'labTechElena',
            id: fixtureUuid('b2000000', 30),
            staffPositionTypeId: labTechnicianType.id,
            employeeCode: 'Elena Markovic',
            specialization: 'Clinical Chemistry',
            licenseNumber: 'MLT-6701',
            hireDate: dateOnly('2020-08-10'),
            bio: 'Elena Markovic processes chemistry panels, quality controls, and urgent diagnostic samples.',
            isPublicProfile: false,
            departments: [{ departmentId: departmentsAndServices.departments.diagnostics.id, isPrimary: true }],
            schedule: { departmentId: departmentsAndServices.departments.diagnostics.id, startTime: '12:00', endTime: '20:00' },
        },
        {
            key: 'pharmacistOmar',
            id: fixtureUuid('b2000000', 31),
            staffPositionTypeId: pharmacistType.id,
            employeeCode: 'Omar Rahman',
            specialization: 'Medication Safety',
            licenseNumber: 'RPH-6801',
            hireDate: dateOnly('2021-04-19'),
            bio: 'Omar Rahman supports medication safety, substitutions, and counseling for complex prescriptions.',
            isPublicProfile: false,
            departments: [{ departmentId: departmentsAndServices.departments.pharmacy.id, isPrimary: true }],
            schedule: { departmentId: departmentsAndServices.departments.pharmacy.id, startTime: '12:00', endTime: '20:00' },
        },
        {
            key: 'receptionistIris',
            id: fixtureUuid('b2000000', 32),
            staffPositionTypeId: receptionistType.id,
            employeeCode: 'Iris Van Dijk',
            specialization: 'Patient Access',
            licenseNumber: null,
            hireDate: dateOnly('2023-09-11'),
            bio: 'Iris Van Dijk coordinates intake, appointment movement, and patient-facing scheduling support.',
            isPublicProfile: false,
            departments: [
                { departmentId: billingAdmin.id, isPrimary: true },
                { departmentId: departmentsAndServices.departments.primaryCare.id, isPrimary: false },
            ],
            schedule: { departmentId: billingAdmin.id, startTime: '10:00', endTime: '18:00' },
        },
    ];

    const additionalStaff = new Map<string, Awaited<ReturnType<typeof upsertStaffProfile>>>();

    for (const fixture of additionalStaffFixtures) {
        const profile = await upsertStaffProfile({
            id: fixture.id,
            userId: fixture.id,
            staffPositionTypeId: fixture.staffPositionTypeId,
            employeeCode: fixture.employeeCode,
            specialization: fixture.specialization,
            licenseNumber: fixture.licenseNumber,
            hireDate: fixture.hireDate,
            bio: fixture.bio,
            isPublicProfile: fixture.isPublicProfile,
        });

        additionalStaff.set(fixture.key, profile);

        for (const assignment of fixture.departments) {
            await upsertDepartmentAssignment(
                profile.id,
                assignment.departmentId,
                assignment.isPrimary,
            );
        }
    }

    await Promise.all([
        upsertDepartmentAssignment(clinicAdmin.id, billingAdmin.id, true),
        upsertDepartmentAssignment(cardiologist.id, cardiology.id, true),
        upsertDepartmentAssignment(cardiologist.id, departmentsAndServices.departments.primaryCare.id, false),
        upsertDepartmentAssignment(pediatrician.id, pediatrics.id, true),
        upsertDepartmentAssignment(emergencyNurse.id, emergency.id, true),
        upsertDepartmentAssignment(emergencyNurse.id, departmentsAndServices.departments.primaryCare.id, false),
        upsertDepartmentAssignment(labTechnician.id, departmentsAndServices.departments.diagnostics.id, true),
        upsertDepartmentAssignment(pharmacist.id, departmentsAndServices.departments.pharmacy.id, true),
        upsertDepartmentAssignment(staff.receptionist.id, billingAdmin.id, false),
    ]);

    await seedStaffSchedules([
        { staffProfileId: clinicAdmin.id, departmentId: billingAdmin.id, startTime: '09:00', endTime: '17:00' },
        { staffProfileId: cardiologist.id, departmentId: cardiology.id, startTime: '08:30', endTime: '16:30' },
        { staffProfileId: pediatrician.id, departmentId: pediatrics.id, startTime: '09:00', endTime: '17:00' },
        { staffProfileId: emergencyNurse.id, departmentId: emergency.id, startTime: '07:00', endTime: '15:00' },
        {
            staffProfileId: labTechnician.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            startTime: '08:00',
            endTime: '16:00',
        },
        {
            staffProfileId: pharmacist.id,
            departmentId: departmentsAndServices.departments.pharmacy.id,
            startTime: '09:00',
            endTime: '17:30',
        },
    ]);

    await seedStaffSchedules(
        additionalStaffFixtures.map((fixture) => ({
            staffProfileId: fixture.id,
            departmentId: fixture.schedule.departmentId,
            startTime: fixture.schedule.startTime,
            endTime: fixture.schedule.endTime,
        })),
    );

    const extraPatients = [];
    const patientFixtures = [
        {
            id: fixtureUuid('a1000000', 1),
            userId: DEMO_USER_IDS.patientSamir,
            firstName: 'Samir',
            lastName: 'Patel',
            email: 'samir.patel@medsphere.local',
            phone: '+44 20 5550 0110',
            dateOfBirth: dateOnly('1982-06-18'),
            gender: 'male',
            bloodType: BloodType.A_NEGATIVE,
            personalNumber: 'MSP-PAT-0110',
            address: '19 King Street, London',
            emergencyContact: 'Neha Patel',
            emergencyPhone: '+44 20 5550 0190',
            allergies: ['Sulfonamides'],
            medicalNotes: {
                chronicConditions: ['Hyperlipidemia'],
                lastVisitReason: 'Cardiology review',
            },
        },
        {
            id: fixtureUuid('a1000000', 2),
            userId: DEMO_USER_IDS.patientLina,
            firstName: 'Lina',
            lastName: 'Hoxha',
            email: 'lina.hoxha@medsphere.local',
            phone: '+383 44 100 111',
            dateOfBirth: dateOnly('2016-03-07'),
            gender: 'female',
            bloodType: BloodType.O_NEGATIVE,
            personalNumber: 'MSP-PAT-0111',
            address: '12 Dardania Street, Prishtina',
            emergencyContact: 'Arta Hoxha',
            emergencyPhone: '+383 44 100 112',
            allergies: [],
            medicalNotes: {
                chronicConditions: [],
                pediatricNotes: 'Routine growth monitoring',
            },
        },
        {
            id: fixtureUuid('a1000000', 3),
            userId: null,
            firstName: 'Aisha',
            lastName: 'Khan',
            email: 'aisha.khan@example.local',
            phone: '+971 50 555 0112',
            dateOfBirth: dateOnly('1994-01-25'),
            gender: 'female',
            bloodType: BloodType.B_NEGATIVE,
            personalNumber: 'MSP-PAT-0112',
            address: '82 Marina Walk, Dubai',
            emergencyContact: 'Omar Khan',
            emergencyPhone: '+971 50 555 0192',
            allergies: ['Shellfish'],
            medicalNotes: {
                chronicConditions: ['Migraine'],
                preferredLanguage: 'English',
            },
        },
        {
            id: fixtureUuid('a1000000', 4),
            userId: null,
            firstName: 'Chen',
            lastName: 'Wei',
            email: 'chen.wei@example.local',
            phone: '+86 10 5550 0113',
            dateOfBirth: dateOnly('1971-12-02'),
            gender: 'male',
            bloodType: BloodType.AB_POSITIVE,
            personalNumber: 'MSP-PAT-0113',
            address: '5 Chaoyang Road, Beijing',
            emergencyContact: 'Lin Wei',
            emergencyPhone: '+86 10 5550 0193',
            allergies: [],
            medicalNotes: {
                chronicConditions: ['Type 2 diabetes'],
                lastVisitReason: 'Glucose control',
            },
        },
        {
            id: fixtureUuid('a1000000', 5),
            userId: null,
            firstName: 'Mateo',
            lastName: 'Garcia',
            email: 'mateo.garcia@example.local',
            phone: '+34 91 555 0114',
            dateOfBirth: dateOnly('1968-08-14'),
            gender: 'male',
            bloodType: BloodType.O_POSITIVE,
            personalNumber: 'MSP-PAT-0114',
            address: '23 Gran Via, Madrid',
            emergencyContact: 'Lucia Garcia',
            emergencyPhone: '+34 91 555 0194',
            allergies: ['Aspirin'],
            medicalNotes: {
                chronicConditions: ['Coronary artery disease'],
                fallRisk: false,
            },
        },
        {
            id: fixtureUuid('a1000000', 6),
            userId: null,
            firstName: 'Grace',
            lastName: 'Kim',
            email: 'grace.kim@example.local',
            phone: '+82 2 555 0115',
            dateOfBirth: dateOnly('1998-05-30'),
            gender: 'female',
            bloodType: BloodType.B_POSITIVE,
            personalNumber: 'MSP-PAT-0115',
            address: '44 Mapo Avenue, Seoul',
            emergencyContact: 'Jin Kim',
            emergencyPhone: '+82 2 555 0195',
            allergies: ['Peanuts'],
            medicalNotes: {
                chronicConditions: ['Eczema'],
                lastVisitReason: 'Radiology referral',
            },
        },
        {
            id: fixtureUuid('a1000000', 7),
            userId: null,
            firstName: 'Omar',
            lastName: 'Haddad',
            email: 'omar.haddad@example.local',
            phone: '+961 1 555 0116',
            dateOfBirth: dateOnly('1989-10-04'),
            gender: 'male',
            bloodType: BloodType.UNKNOWN,
            personalNumber: 'MSP-PAT-0116',
            address: '7 Hamra Street, Beirut',
            emergencyContact: 'Layla Haddad',
            emergencyPhone: '+961 1 555 0196',
            allergies: [],
            medicalNotes: {
                chronicConditions: [],
                lastVisitReason: 'Lab collection',
            },
        },
        {
            id: fixtureUuid('a1000000', 8),
            userId: null,
            firstName: 'Priya',
            lastName: 'Nair',
            email: 'priya.nair@example.local',
            phone: '+91 44 5550 0117',
            dateOfBirth: dateOnly('1979-02-11'),
            gender: 'female',
            bloodType: BloodType.A_POSITIVE,
            personalNumber: 'MSP-PAT-0117',
            address: '16 Anna Salai, Chennai',
            emergencyContact: 'Dev Nair',
            emergencyPhone: '+91 44 5550 0197',
            allergies: ['Iodine contrast'],
            medicalNotes: {
                chronicConditions: ['Hypothyroidism'],
                lastVisitReason: 'Medication counseling',
            },
        },
        {
            id: fixtureUuid('a1000000', 9),
            userId: null,
            firstName: 'Elias',
            lastName: 'Hoxha',
            email: 'elias.hoxha@example.local',
            phone: '+383 44 100 118',
            dateOfBirth: dateOnly('2001-07-21'),
            gender: 'male',
            bloodType: BloodType.AB_NEGATIVE,
            personalNumber: 'MSP-PAT-0118',
            address: '28 Iliria Avenue, Prizren',
            emergencyContact: 'Nora Hoxha',
            emergencyPhone: '+383 44 100 119',
            allergies: [],
            medicalNotes: {
                chronicConditions: [],
                lastVisitReason: 'Cancelled pediatric-family consult',
            },
        },
        {
            id: fixtureUuid('a1000000', 10),
            userId: null,
            firstName: 'Fatima',
            lastName: 'Al-Sayed',
            email: 'fatima.alsayed@example.local',
            phone: '+20 2 5550 0119',
            dateOfBirth: dateOnly('1957-04-09'),
            gender: 'female',
            bloodType: BloodType.O_POSITIVE,
            personalNumber: 'MSP-PAT-0119',
            address: '31 Zamalek Street, Cairo',
            emergencyContact: 'Mona Al-Sayed',
            emergencyPhone: '+20 2 5550 0199',
            allergies: ['Cephalosporins'],
            medicalNotes: {
                chronicConditions: ['Hypertension', 'Osteoarthritis'],
                lastVisitReason: 'Missed follow-up',
            },
        },
    ];

    const additionalPatientFixtures = [
        {
            id: fixtureUuid('a1000000', 11),
            userId: null,
            firstName: 'Ingrid',
            lastName: 'Larsson',
            email: 'ingrid.larsson@example.local',
            phone: '+46 8 555 0120',
            dateOfBirth: dateOnly('1988-12-15'),
            gender: 'female',
            bloodType: BloodType.A_POSITIVE,
            personalNumber: 'MSP-PAT-0120',
            address: '18 Sveavagen, Stockholm',
            emergencyContact: 'Erik Larsson',
            emergencyPhone: '+46 8 555 0190',
            allergies: ['Nickel'],
            medicalNotes: { chronicConditions: ['Migraine'], lastVisitReason: 'Neurology consult' },
        },
        {
            id: fixtureUuid('a1000000', 12),
            userId: null,
            firstName: 'Tariq',
            lastName: 'Rahman',
            email: 'tariq.rahman@example.local',
            phone: '+880 2 555 0121',
            dateOfBirth: dateOnly('1974-07-03'),
            gender: 'male',
            bloodType: BloodType.B_POSITIVE,
            personalNumber: 'MSP-PAT-0121',
            address: '41 Dhanmondi Road, Dhaka',
            emergencyContact: 'Samira Rahman',
            emergencyPhone: '+880 2 555 0191',
            allergies: [],
            medicalNotes: { chronicConditions: ['Type 2 diabetes'], lastVisitReason: 'Endocrinology review' },
        },
        {
            id: fixtureUuid('a1000000', 13),
            userId: null,
            firstName: 'Marta',
            lastName: 'Nowak',
            email: 'marta.nowak@example.local',
            phone: '+48 22 555 0122',
            dateOfBirth: dateOnly('1991-09-28'),
            gender: 'female',
            bloodType: BloodType.O_NEGATIVE,
            personalNumber: 'MSP-PAT-0122',
            address: '9 Marszalkowska, Warsaw',
            emergencyContact: 'Piotr Nowak',
            emergencyPhone: '+48 22 555 0192',
            allergies: ['Ibuprofen'],
            medicalNotes: { chronicConditions: [], lastVisitReason: 'Dermatology skin check' },
        },
        {
            id: fixtureUuid('a1000000', 14),
            userId: null,
            firstName: 'Jonas',
            lastName: 'Muller',
            email: 'jonas.muller@example.local',
            phone: '+49 30 555 0123',
            dateOfBirth: dateOnly('1980-02-06'),
            gender: 'male',
            bloodType: BloodType.A_NEGATIVE,
            personalNumber: 'MSP-PAT-0123',
            address: '22 Friedrichstrasse, Berlin',
            emergencyContact: 'Hanna Muller',
            emergencyPhone: '+49 30 555 0193',
            allergies: ['Bee venom'],
            medicalNotes: { chronicConditions: ['Knee osteoarthritis'], lastVisitReason: 'Orthopedic consult' },
        },
        {
            id: fixtureUuid('a1000000', 15),
            userId: null,
            firstName: 'Noura',
            lastName: 'Mansour',
            email: 'noura.mansour@example.local',
            phone: '+962 6 555 0124',
            dateOfBirth: dateOnly('1996-04-17'),
            gender: 'female',
            bloodType: BloodType.AB_POSITIVE,
            personalNumber: 'MSP-PAT-0124',
            address: '13 Rainbow Street, Amman',
            emergencyContact: 'Rami Mansour',
            emergencyPhone: '+962 6 555 0194',
            allergies: [],
            medicalNotes: { chronicConditions: [], lastVisitReason: 'Prenatal counseling' },
        },
        {
            id: fixtureUuid('a1000000', 16),
            userId: null,
            firstName: 'Lucas',
            lastName: 'Moreau',
            email: 'lucas.moreau@example.local',
            phone: '+33 1 5550 0125',
            dateOfBirth: dateOnly('2008-01-10'),
            gender: 'male',
            bloodType: BloodType.O_POSITIVE,
            personalNumber: 'MSP-PAT-0125',
            address: '6 Rue Lafayette, Paris',
            emergencyContact: 'Claire Moreau',
            emergencyPhone: '+33 1 5550 0195',
            allergies: ['Tree nuts'],
            medicalNotes: { chronicConditions: ['Atopic dermatitis'], lastVisitReason: 'Pediatric rash visit' },
        },
        {
            id: fixtureUuid('a1000000', 17),
            userId: null,
            firstName: 'Rina',
            lastName: 'Sato',
            email: 'rina.sato@example.local',
            phone: '+81 3 5550 0126',
            dateOfBirth: dateOnly('1986-10-19'),
            gender: 'female',
            bloodType: BloodType.B_NEGATIVE,
            personalNumber: 'MSP-PAT-0126',
            address: '3 Shibuya Crossing, Tokyo',
            emergencyContact: 'Ken Sato',
            emergencyPhone: '+81 3 5550 0196',
            allergies: [],
            medicalNotes: { chronicConditions: ['Anxiety'], lastVisitReason: 'Therapy session' },
        },
        {
            id: fixtureUuid('a1000000', 18),
            userId: null,
            firstName: 'Michael',
            lastName: 'Osei',
            email: 'michael.osei@example.local',
            phone: '+233 30 555 0127',
            dateOfBirth: dateOnly('1962-05-22'),
            gender: 'male',
            bloodType: BloodType.A_POSITIVE,
            personalNumber: 'MSP-PAT-0127',
            address: '15 Osu Avenue, Accra',
            emergencyContact: 'Akua Osei',
            emergencyPhone: '+233 30 555 0197',
            allergies: ['Contrast dye'],
            medicalNotes: { chronicConditions: ['Prostate cancer history'], lastVisitReason: 'Oncology follow-up' },
        },
        {
            id: fixtureUuid('a1000000', 19),
            userId: null,
            firstName: 'Sofia',
            lastName: 'Andersson',
            email: 'sofia.andersson@example.local',
            phone: '+45 33 555 0128',
            dateOfBirth: dateOnly('1977-11-01'),
            gender: 'female',
            bloodType: BloodType.UNKNOWN,
            personalNumber: 'MSP-PAT-0128',
            address: '12 Nyhavn, Copenhagen',
            emergencyContact: 'Mikkel Andersson',
            emergencyPhone: '+45 33 555 0198',
            allergies: ['Latex'],
            medicalNotes: { chronicConditions: ['Hypothyroidism'], lastVisitReason: 'Thyroid consultation' },
        },
        {
            id: fixtureUuid('a1000000', 20),
            userId: null,
            firstName: 'Diego',
            lastName: 'Fernandez',
            email: 'diego.fernandez@example.local',
            phone: '+52 55 5550 0129',
            dateOfBirth: dateOnly('1983-06-30'),
            gender: 'male',
            bloodType: BloodType.O_POSITIVE,
            personalNumber: 'MSP-PAT-0129',
            address: '77 Reforma, Mexico City',
            emergencyContact: 'Valeria Fernandez',
            emergencyPhone: '+52 55 5550 0199',
            allergies: [],
            medicalNotes: { chronicConditions: ['Lumbar strain'], lastVisitReason: 'Physical therapy evaluation' },
        },
        {
            id: fixtureUuid('a1000000', 21),
            userId: null,
            firstName: 'Zara',
            lastName: 'Ahmed',
            email: 'zara.ahmed@example.local',
            phone: '+92 21 555 0130',
            dateOfBirth: dateOnly('1999-03-12'),
            gender: 'female',
            bloodType: BloodType.AB_NEGATIVE,
            personalNumber: 'MSP-PAT-0130',
            address: '31 Clifton Road, Karachi',
            emergencyContact: 'Imran Ahmed',
            emergencyPhone: '+92 21 555 0190',
            allergies: ['Metronidazole'],
            medicalNotes: { chronicConditions: [], lastVisitReason: 'Dental pain visit' },
        },
        {
            id: fixtureUuid('a1000000', 22),
            userId: null,
            firstName: 'Arthur',
            lastName: 'Campbell',
            email: 'arthur.campbell@example.local',
            phone: '+61 2 5550 0131',
            dateOfBirth: dateOnly('1952-08-08'),
            gender: 'male',
            bloodType: BloodType.B_POSITIVE,
            personalNumber: 'MSP-PAT-0131',
            address: '10 George Street, Sydney',
            emergencyContact: 'Mia Campbell',
            emergencyPhone: '+61 2 5550 0191',
            allergies: ['Warfarin sensitivity'],
            medicalNotes: { chronicConditions: ['Glaucoma'], lastVisitReason: 'Eye exam' },
        },
        {
            id: fixtureUuid('a1000000', 23),
            userId: null,
            firstName: 'Elif',
            lastName: 'Yilmaz',
            email: 'elif.yilmaz@example.local',
            phone: '+90 212 555 0132',
            dateOfBirth: dateOnly('1993-12-03'),
            gender: 'female',
            bloodType: BloodType.A_POSITIVE,
            personalNumber: 'MSP-PAT-0132',
            address: '22 Istiklal Avenue, Istanbul',
            emergencyContact: 'Can Yilmaz',
            emergencyPhone: '+90 212 555 0192',
            allergies: [],
            medicalNotes: { chronicConditions: [], lastVisitReason: 'Gynecology visit' },
        },
        {
            id: fixtureUuid('a1000000', 24),
            userId: null,
            firstName: 'Bongani',
            lastName: 'Dlamini',
            email: 'bongani.dlamini@example.local',
            phone: '+27 11 555 0133',
            dateOfBirth: dateOnly('1970-01-26'),
            gender: 'male',
            bloodType: BloodType.O_NEGATIVE,
            personalNumber: 'MSP-PAT-0133',
            address: '8 Rosebank Road, Johannesburg',
            emergencyContact: 'Thandi Dlamini',
            emergencyPhone: '+27 11 555 0193',
            allergies: ['Sulfonamides'],
            medicalNotes: { chronicConditions: ['Hypertension'], lastVisitReason: 'Cardiology consultation' },
        },
        {
            id: fixtureUuid('a1000000', 25),
            userId: null,
            firstName: 'Lena',
            lastName: 'Hoffmann',
            email: 'lena.hoffmann@example.local',
            phone: '+43 1 555 0134',
            dateOfBirth: dateOnly('2004-05-16'),
            gender: 'female',
            bloodType: BloodType.B_NEGATIVE,
            personalNumber: 'MSP-PAT-0134',
            address: '5 Ringstrasse, Vienna',
            emergencyContact: 'Klara Hoffmann',
            emergencyPhone: '+43 1 555 0194',
            allergies: ['Peanuts'],
            medicalNotes: { chronicConditions: ['Asthma'], lastVisitReason: 'Primary care follow-up' },
        },
        {
            id: fixtureUuid('a1000000', 26),
            userId: null,
            firstName: 'Arjun',
            lastName: 'Mehta',
            email: 'arjun.mehta@example.local',
            phone: '+91 22 5550 0135',
            dateOfBirth: dateOnly('1990-09-09'),
            gender: 'male',
            bloodType: BloodType.A_NEGATIVE,
            personalNumber: 'MSP-PAT-0135',
            address: '42 Bandra West, Mumbai',
            emergencyContact: 'Kavya Mehta',
            emergencyPhone: '+91 22 5550 0195',
            allergies: [],
            medicalNotes: { chronicConditions: [], lastVisitReason: 'Dental cleaning' },
        },
        {
            id: fixtureUuid('a1000000', 27),
            userId: null,
            firstName: 'Yara',
            lastName: 'Costa',
            email: 'yara.costa@example.local',
            phone: '+55 21 5550 0136',
            dateOfBirth: dateOnly('1984-06-04'),
            gender: 'female',
            bloodType: BloodType.O_POSITIVE,
            personalNumber: 'MSP-PAT-0136',
            address: '19 Copacabana, Rio de Janeiro',
            emergencyContact: 'Pedro Costa',
            emergencyPhone: '+55 21 5550 0196',
            allergies: ['Penicillin'],
            medicalNotes: { chronicConditions: ['Depression'], lastVisitReason: 'Psychiatry follow-up' },
        },
        {
            id: fixtureUuid('a1000000', 28),
            userId: null,
            firstName: 'Mina',
            lastName: 'Park',
            email: 'mina.park@example.local',
            phone: '+82 2 555 0137',
            dateOfBirth: dateOnly('1966-02-23'),
            gender: 'female',
            bloodType: BloodType.AB_POSITIVE,
            personalNumber: 'MSP-PAT-0137',
            address: '81 Gangnam-daero, Seoul',
            emergencyContact: 'Joon Park',
            emergencyPhone: '+82 2 555 0197',
            allergies: [],
            medicalNotes: { chronicConditions: ['Breast cancer history'], lastVisitReason: 'Cancer screening coordination' },
        },
        {
            id: fixtureUuid('a1000000', 29),
            userId: null,
            firstName: 'Petar',
            lastName: 'Ilic',
            email: 'petar.ilic@example.local',
            phone: '+381 11 555 0138',
            dateOfBirth: dateOnly('1976-03-18'),
            gender: 'male',
            bloodType: BloodType.B_POSITIVE,
            personalNumber: 'MSP-PAT-0138',
            address: '14 Knez Mihailova, Belgrade',
            emergencyContact: 'Milena Ilic',
            emergencyPhone: '+381 11 555 0198',
            allergies: ['Codeine'],
            medicalNotes: { chronicConditions: ['Sciatica'], lastVisitReason: 'Rehabilitation follow-up' },
        },
        {
            id: fixtureUuid('a1000000', 30),
            userId: null,
            firstName: 'Amina',
            lastName: 'Diop',
            email: 'amina.diop@example.local',
            phone: '+221 33 555 0139',
            dateOfBirth: dateOnly('1995-07-29'),
            gender: 'female',
            bloodType: BloodType.UNKNOWN,
            personalNumber: 'MSP-PAT-0139',
            address: '2 Plateau Avenue, Dakar',
            emergencyContact: 'Moussa Diop',
            emergencyPhone: '+221 33 555 0199',
            allergies: [],
            medicalNotes: { chronicConditions: [], lastVisitReason: 'Retinal screening' },
        },
        {
            id: fixtureUuid('a1000000', 31),
            userId: null,
            firstName: 'Ethan',
            lastName: 'Nguyen',
            email: 'ethan.nguyen@example.local',
            phone: '+1 415 555 0140',
            dateOfBirth: dateOnly('2012-10-13'),
            gender: 'male',
            bloodType: BloodType.O_POSITIVE,
            personalNumber: 'MSP-PAT-0140',
            address: '101 Market Street, San Francisco',
            emergencyContact: 'Mai Nguyen',
            emergencyPhone: '+1 415 555 0190',
            allergies: ['Egg'],
            medicalNotes: { chronicConditions: [], lastVisitReason: 'Child wellness check' },
        },
        {
            id: fixtureUuid('a1000000', 32),
            userId: null,
            firstName: 'Olena',
            lastName: 'Shevchenko',
            email: 'olena.shevchenko@example.local',
            phone: '+380 44 555 0141',
            dateOfBirth: dateOnly('1981-12-22'),
            gender: 'female',
            bloodType: BloodType.A_POSITIVE,
            personalNumber: 'MSP-PAT-0141',
            address: '17 Khreshchatyk, Kyiv',
            emergencyContact: 'Dmytro Shevchenko',
            emergencyPhone: '+380 44 555 0191',
            allergies: ['Macrolides'],
            medicalNotes: { chronicConditions: ['Thyroid nodules'], lastVisitReason: 'Thyroid consultation' },
        },
        {
            id: fixtureUuid('a1000000', 33),
            userId: null,
            firstName: 'Hassan',
            lastName: 'Nasser',
            email: 'hassan.nasser@example.local',
            phone: '+974 44 555 0142',
            dateOfBirth: dateOnly('1959-11-11'),
            gender: 'male',
            bloodType: BloodType.AB_NEGATIVE,
            personalNumber: 'MSP-PAT-0142',
            address: '55 Corniche Road, Doha',
            emergencyContact: 'Maha Nasser',
            emergencyPhone: '+974 44 555 0192',
            allergies: [],
            medicalNotes: { chronicConditions: ['Coronary artery disease'], lastVisitReason: 'ECG' },
        },
        {
            id: fixtureUuid('a1000000', 34),
            userId: null,
            firstName: 'Clara',
            lastName: 'Schmidt',
            email: 'clara.schmidt@example.local',
            phone: '+41 44 555 0143',
            dateOfBirth: dateOnly('1997-08-27'),
            gender: 'female',
            bloodType: BloodType.B_NEGATIVE,
            personalNumber: 'MSP-PAT-0143',
            address: '7 Bahnhofstrasse, Zurich',
            emergencyContact: 'Lukas Schmidt',
            emergencyPhone: '+41 44 555 0193',
            allergies: ['Adhesive tape'],
            medicalNotes: { chronicConditions: [], lastVisitReason: 'Acne and rash visit' },
        },
    ];

    for (const patientFixture of [...patientFixtures, ...additionalPatientFixtures]) {
        extraPatients.push(await upsertPatient(patientFixture));
    }

    const allPatients = [
        patients.patient,
        patients.john,
        patients.maria,
        ...extraPatients,
    ];

    const [medications, consumables, laboratorySupplies, devices, vaccines, radiologySupplies] =
        await Promise.all([
            prisma.inventoryCategory.findUniqueOrThrow({ where: { name: 'Medications' } }),
            prisma.inventoryCategory.findUniqueOrThrow({ where: { name: 'Consumables' } }),
            prisma.inventoryCategory.findUniqueOrThrow({ where: { name: 'Laboratory Supplies' } }),
            prisma.inventoryCategory.findUniqueOrThrow({ where: { name: 'Medical Devices' } }),
            prisma.inventoryCategory.findUniqueOrThrow({ where: { name: 'Vaccines' } }),
            prisma.inventoryCategory.findUniqueOrThrow({ where: { name: 'Radiology Supplies' } }),
        ]);

    const inventoryFixtures = [
        {
            inventoryCategoryId: medications.id,
            departmentId: departmentsAndServices.departments.pharmacy.id,
            sku: 'MED-PARA-500',
            name: 'Paracetamol 500mg',
            description: 'Tablet analgesic and antipyretic',
            unitOfMeasure: 'tablet',
            currentStock: '320',
            reorderLevel: '80',
            unitCost: '0.10',
            expiryDate: dateOnly('2027-11-30'),
        },
        {
            inventoryCategoryId: medications.id,
            departmentId: departmentsAndServices.departments.pharmacy.id,
            sku: 'MED-ATOR-20',
            name: 'Atorvastatin 20mg',
            description: 'Tablet lipid-lowering medication',
            unitOfMeasure: 'tablet',
            currentStock: '90',
            reorderLevel: '45',
            unitCost: '0.55',
            expiryDate: dateOnly('2027-08-31'),
        },
        {
            inventoryCategoryId: medications.id,
            departmentId: departmentsAndServices.departments.pharmacy.id,
            sku: 'MED-SALB-100',
            name: 'Salbutamol Inhaler 100mcg',
            description: 'Metered-dose bronchodilator inhaler',
            unitOfMeasure: 'inhaler',
            currentStock: '14',
            reorderLevel: '20',
            unitCost: '8.75',
            expiryDate: dateOnly('2027-05-31'),
        },
        {
            inventoryCategoryId: consumables.id,
            departmentId: emergency.id,
            sku: 'SUP-SYR-3ML',
            name: 'Syringe 3ml',
            description: 'Sterile single-use syringe',
            unitOfMeasure: 'piece',
            currentStock: '500',
            reorderLevel: '150',
            unitCost: '0.08',
            expiryDate: dateOnly('2028-02-28'),
        },
        {
            inventoryCategoryId: laboratorySupplies.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            sku: 'LAB-URINE-CUP',
            name: 'Sterile Urine Cup',
            description: 'Sterile sample container',
            unitOfMeasure: 'piece',
            currentStock: '65',
            reorderLevel: '40',
            unitCost: '0.35',
            expiryDate: dateOnly('2028-01-31'),
        },
        {
            inventoryCategoryId: devices.id,
            departmentId: cardiology.id,
            sku: 'DEV-ECG-ELECTRODE',
            name: 'ECG Electrodes',
            description: 'Disposable ECG electrode pads',
            unitOfMeasure: 'pack',
            currentStock: '28',
            reorderLevel: '12',
            unitCost: '6.25',
            expiryDate: dateOnly('2027-09-30'),
        },
        {
            inventoryCategoryId: vaccines.id,
            departmentId: pediatrics.id,
            sku: 'VAC-FLU-2026',
            name: 'Influenza Vaccine 2026',
            description: 'Single-dose influenza vaccine',
            unitOfMeasure: 'dose',
            currentStock: '36',
            reorderLevel: '25',
            unitCost: '11.00',
            expiryDate: dateOnly('2026-12-31'),
        },
        {
            inventoryCategoryId: radiologySupplies.id,
            departmentId: radiology.id,
            sku: 'RAD-CONTRAST-IO',
            name: 'Iodinated Contrast 50ml',
            description: 'Contrast media for selected imaging workflows',
            unitOfMeasure: 'vial',
            currentStock: '9',
            reorderLevel: '8',
            unitCost: '24.00',
            expiryDate: dateOnly('2027-04-30'),
        },
    ];

    const inventoryMap = new Map<string, Awaited<ReturnType<typeof upsertInventoryItem>>>();
    for (const [index, item] of inventoryFixtures.entries()) {
        const createdItem = await upsertInventoryItem(item);
        inventoryMap.set(item.sku, createdItem);
        await upsertInventoryTransaction({
            id: fixtureUuid('a8100000', index + 1),
            inventoryItemId: createdItem.id,
            transactionType: InventoryTransactionType.RECEIVED,
            quantity: item.currentStock,
            unitCost: item.unitCost,
            batchNumber: `${item.sku}-OPENING`,
            expiryDate: item.expiryDate,
            notes: 'Expanded demo opening balance',
            performedByUserId: clinicAdmin.userId,
        });
    }

    const cardioCompleted = await upsertAppointment({
        id: fixtureUuid('a2000000', 1),
        patientId: extraPatients[0].id,
        departmentId: cardiology.id,
        serviceCatalogId: ecg.id,
        staffProfileId: cardiologist.id,
        status: AppointmentStatus.COMPLETED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: utcAt(-4, 9, 0),
        endAt: utcAt(-4, 9, 20),
        durationMinutes: 20,
        basePrice: '65.00',
        notes: 'ECG completed before lipid management review.',
        checkedInAt: utcAt(-4, 8, 50),
        completedAt: utcAt(-4, 9, 18),
    });
    const cardioFuture = await upsertAppointment({
        id: fixtureUuid('a2000000', 2),
        patientId: extraPatients[4].id,
        departmentId: cardiology.id,
        serviceCatalogId: cardiologyConsult.id,
        staffProfileId: cardiologist.id,
        status: AppointmentStatus.CONFIRMED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: utcAt(2, 10, 0),
        endAt: utcAt(2, 10, 40),
        durationMinutes: 40,
        basePrice: '140.00',
        notes: 'Chest discomfort follow-up with cardiology.',
        checkedInAt: null,
        completedAt: null,
    });
    const pediatricCompleted = await upsertAppointment({
        id: fixtureUuid('a2000000', 3),
        patientId: extraPatients[1].id,
        departmentId: pediatrics.id,
        serviceCatalogId: childWellness.id,
        staffProfileId: pediatrician.id,
        status: AppointmentStatus.COMPLETED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: utcAt(-2, 11, 0),
        endAt: utcAt(-2, 11, 30),
        durationMinutes: 30,
        basePrice: '80.00',
        notes: 'Growth and immunization review completed.',
        checkedInAt: utcAt(-2, 10, 50),
        completedAt: utcAt(-2, 11, 28),
    });
    const primaryScheduled = await upsertAppointment({
        id: fixtureUuid('a2000000', 4),
        patientId: extraPatients[2].id,
        departmentId: departmentsAndServices.departments.primaryCare.id,
        serviceCatalogId: departmentsAndServices.services.generalConsultation.id,
        staffProfileId: staff.doctor.id,
        status: AppointmentStatus.SCHEDULED,
        appointmentType: AppointmentType.VIRTUAL,
        scheduledAt: utcAt(1, 13, 0),
        endAt: utcAt(1, 13, 30),
        durationMinutes: 30,
        basePrice: '85.00',
        notes: 'Virtual migraine follow-up scheduled.',
        checkedInAt: null,
        completedAt: null,
    });
    const emergencyActive = await upsertAppointment({
        id: fixtureUuid('a2000000', 5),
        patientId: extraPatients[3].id,
        departmentId: emergency.id,
        serviceCatalogId: urgentAssessment.id,
        staffProfileId: emergencyNurse.id,
        status: AppointmentStatus.IN_PROGRESS,
        appointmentType: AppointmentType.WALK_IN,
        scheduledAt: utcAt(1, 14, 0),
        endAt: utcAt(1, 14, 30),
        durationMinutes: 30,
        basePrice: '120.00',
        notes: 'Walk-in dizziness and glucose review in progress.',
        checkedInAt: utcAt(1, 13, 54),
        completedAt: null,
    });
    const radiologyFuture = await upsertAppointment({
        id: fixtureUuid('a2000000', 6),
        patientId: extraPatients[5].id,
        departmentId: radiology.id,
        serviceCatalogId: xray.id,
        staffProfileId: additionalStaff.get('radiologistAleksei')!.id,
        status: AppointmentStatus.CONFIRMED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: utcAt(1, 12, 30),
        endAt: utcAt(1, 12, 55),
        durationMinutes: 25,
        basePrice: '75.00',
        notes: 'Imaging appointment coordinated by administration.',
        checkedInAt: null,
        completedAt: null,
    });
    const labCollection = await upsertAppointment({
        id: fixtureUuid('a2000000', 7),
        patientId: extraPatients[6].id,
        departmentId: departmentsAndServices.departments.diagnostics.id,
        serviceCatalogId: sampleCollection.id,
        staffProfileId: labTechnician.id,
        status: AppointmentStatus.CHECKED_IN,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: utcAt(1, 8, 30),
        endAt: utcAt(1, 8, 45),
        durationMinutes: 15,
        basePrice: '25.00',
        notes: 'Patient checked in for lab-only sample collection.',
        checkedInAt: utcAt(1, 8, 20),
        completedAt: null,
    });
    const pharmacyCompleted = await upsertAppointment({
        id: fixtureUuid('a2000000', 8),
        patientId: extraPatients[7].id,
        departmentId: departmentsAndServices.departments.pharmacy.id,
        serviceCatalogId: medicationCounseling.id,
        staffProfileId: pharmacist.id,
        status: AppointmentStatus.COMPLETED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: utcAt(-5, 14, 0),
        endAt: utcAt(-5, 14, 20),
        durationMinutes: 20,
        basePrice: '30.00',
        notes: 'Medication counseling completed for thyroid medication review.',
        checkedInAt: utcAt(-5, 13, 52),
        completedAt: utcAt(-5, 14, 18),
    });
    const cancelled = await upsertAppointment({
        id: fixtureUuid('a2000000', 9),
        patientId: extraPatients[8].id,
        departmentId: pediatrics.id,
        serviceCatalogId: pediatricConsult.id,
        staffProfileId: pediatrician.id,
        status: AppointmentStatus.CANCELLED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: utcAt(3, 9, 30),
        endAt: utcAt(3, 10, 0),
        durationMinutes: 30,
        basePrice: '95.00',
        notes: 'Family requested a later date.',
        checkedInAt: null,
        completedAt: null,
        cancelledAt: utcAt(0, 16, 0),
        cancellationNote: 'Patient family requested reschedule.',
    });
    const noShow = await upsertAppointment({
        id: fixtureUuid('a2000000', 10),
        patientId: extraPatients[9].id,
        departmentId: departmentsAndServices.departments.primaryCare.id,
        serviceCatalogId: departmentsAndServices.services.followUp.id,
        staffProfileId: staff.doctor.id,
        status: AppointmentStatus.NO_SHOW,
        appointmentType: AppointmentType.FOLLOW_UP,
        scheduledAt: utcAt(-1, 8, 30),
        endAt: utcAt(-1, 8, 50),
        durationMinutes: 20,
        basePrice: '55.00',
        notes: 'No-show follow-up used for receptionist workflow.',
        checkedInAt: null,
        completedAt: null,
    });
    const vaccinationCompleted = await upsertAppointment({
        id: fixtureUuid('a2000000', 11),
        patientId: patients.maria.id,
        departmentId: departmentsAndServices.departments.primaryCare.id,
        serviceCatalogId: vaccination.id,
        staffProfileId: staff.nurse.id,
        status: AppointmentStatus.COMPLETED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: utcAt(-6, 10, 0),
        endAt: utcAt(-6, 10, 20),
        durationMinutes: 20,
        basePrice: '40.00',
        notes: 'Seasonal vaccination administered.',
        checkedInAt: utcAt(-6, 9, 50),
        completedAt: utcAt(-6, 10, 16),
    });
    const billingDeskVisit = await upsertAppointment({
        id: fixtureUuid('a2000000', 12),
        patientId: patients.john.id,
        departmentId: billingAdmin.id,
        serviceCatalogId: insuranceVerification.id,
        staffProfileId: clinicAdmin.id,
        status: AppointmentStatus.COMPLETED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: utcAt(-7, 15, 0),
        endAt: utcAt(-7, 15, 20),
        durationMinutes: 20,
        basePrice: '20.00',
        notes: 'Insurance details verified for upcoming follow-up.',
        checkedInAt: utcAt(-7, 14, 54),
        completedAt: utcAt(-7, 15, 18),
    });
    const billingConsultFuture = await upsertAppointment({
        id: fixtureUuid('a2000000', 13),
        patientId: extraPatients[0].id,
        departmentId: billingAdmin.id,
        serviceCatalogId: billingConsultation.id,
        staffProfileId: clinicAdmin.id,
        status: AppointmentStatus.CONFIRMED,
        appointmentType: AppointmentType.IN_PERSON,
        scheduledAt: utcAt(4, 11, 30),
        endAt: utcAt(4, 11, 50),
        durationMinutes: 20,
        basePrice: '15.00',
        notes: 'Payment-plan conversation for cardiology balance.',
        checkedInAt: null,
        completedAt: null,
    });

    const broadAppointmentFixtures = [
        {
            patientId: extraPatients[10].id,
            departmentId: neurology.id,
            serviceCatalogId: migraineConsult.id,
            staffProfileId: additionalStaff.get('neurologistAmina')!.id,
            status: AppointmentStatus.CONFIRMED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(1, 9, 0),
            durationMinutes: 40,
            basePrice: '135.00',
            notes: 'Migraine pattern review with neurology.',
        },
        {
            patientId: extraPatients[11].id,
            departmentId: endocrinology.id,
            serviceCatalogId: diabetesConsult.id,
            staffProfileId: additionalStaff.get('endocrinologistMaya')!.id,
            status: AppointmentStatus.COMPLETED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(-3, 10, 0),
            durationMinutes: 40,
            basePrice: '135.00',
            notes: 'Diabetes medication and glucose trend review completed.',
        },
        {
            patientId: extraPatients[12].id,
            departmentId: dermatology.id,
            serviceCatalogId: skinCheck.id,
            staffProfileId: additionalStaff.get('dermatologistNia')!.id,
            status: AppointmentStatus.SCHEDULED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(5, 11, 0),
            durationMinutes: 30,
            basePrice: '105.00',
            notes: 'Preventive skin check scheduled.',
        },
        {
            patientId: extraPatients[13].id,
            departmentId: orthopedics.id,
            serviceCatalogId: orthopedicConsult.id,
            staffProfileId: additionalStaff.get('orthopedistMateusz')!.id,
            status: AppointmentStatus.CHECKED_IN,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(1, 11, 0),
            durationMinutes: 35,
            basePrice: '130.00',
            notes: 'Knee pain assessment; patient checked in.',
        },
        {
            patientId: extraPatients[14].id,
            departmentId: womensHealth.id,
            serviceCatalogId: prenatalCounseling.id,
            staffProfileId: additionalStaff.get('gynecologistMariam')!.id,
            status: AppointmentStatus.CONFIRMED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(2, 14, 0),
            durationMinutes: 40,
            basePrice: '140.00',
            notes: 'Prenatal counseling appointment confirmed.',
        },
        {
            patientId: extraPatients[15].id,
            departmentId: pediatrics.id,
            serviceCatalogId: pediatricConsult.id,
            staffProfileId: additionalStaff.get('pediatricianMateo')!.id,
            status: AppointmentStatus.COMPLETED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(-2, 12, 30),
            durationMinutes: 30,
            basePrice: '95.00',
            notes: 'Pediatric rash review completed.',
        },
        {
            patientId: extraPatients[16].id,
            departmentId: mentalHealth.id,
            serviceCatalogId: therapySession.id,
            staffProfileId: additionalStaff.get('therapistCamila')!.id,
            status: AppointmentStatus.CONFIRMED,
            appointmentType: AppointmentType.VIRTUAL,
            scheduledAt: utcAt(3, 16, 0),
            durationMinutes: 50,
            basePrice: '115.00',
            notes: 'Virtual therapy session confirmed.',
        },
        {
            patientId: extraPatients[17].id,
            departmentId: oncology.id,
            serviceCatalogId: oncologyFollowUp.id,
            staffProfileId: additionalStaff.get('oncologistFatima')!.id,
            status: AppointmentStatus.COMPLETED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(-8, 10, 30),
            durationMinutes: 40,
            basePrice: '160.00',
            notes: 'Oncology survivorship follow-up completed.',
        },
        {
            patientId: extraPatients[18].id,
            departmentId: endocrinology.id,
            serviceCatalogId: thyroidConsult.id,
            staffProfileId: additionalStaff.get('endocrinologistNoah')!.id,
            status: AppointmentStatus.IN_PROGRESS,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(1, 14, 0),
            durationMinutes: 35,
            basePrice: '125.00',
            notes: 'Thyroid medication review currently in progress.',
        },
        {
            patientId: extraPatients[19].id,
            departmentId: rehabilitation.id,
            serviceCatalogId: physicalTherapyEval.id,
            staffProfileId: additionalStaff.get('physiatristZara')!.id,
            status: AppointmentStatus.CONFIRMED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(4, 8, 30),
            durationMinutes: 45,
            basePrice: '105.00',
            notes: 'Physical therapy evaluation confirmed.',
        },
        {
            patientId: extraPatients[20].id,
            departmentId: dental.id,
            serviceCatalogId: dentalPainVisit.id,
            staffProfileId: additionalStaff.get('dentistSantiago')!.id,
            status: AppointmentStatus.CANCELLED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(1, 12, 30),
            durationMinutes: 30,
            basePrice: '110.00',
            notes: 'Dental pain visit cancelled by patient.',
            cancelledAt: utcAt(0, 8, 10),
            cancellationNote: 'Patient found earlier dental appointment elsewhere.',
        },
        {
            patientId: extraPatients[21].id,
            departmentId: ophthalmology.id,
            serviceCatalogId: eyeExam.id,
            staffProfileId: additionalStaff.get('ophthalmologistIbrahim')!.id,
            status: AppointmentStatus.COMPLETED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(-5, 13, 0),
            durationMinutes: 35,
            basePrice: '100.00',
            notes: 'Comprehensive eye exam completed.',
        },
        {
            patientId: extraPatients[22].id,
            departmentId: womensHealth.id,
            serviceCatalogId: gynecologyVisit.id,
            staffProfileId: additionalStaff.get('gynecologistElena')!.id,
            status: AppointmentStatus.SCHEDULED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(6, 10, 0),
            durationMinutes: 35,
            basePrice: '120.00',
            notes: 'Preventive gynecology visit scheduled.',
        },
        {
            patientId: extraPatients[23].id,
            departmentId: cardiology.id,
            serviceCatalogId: cardiologyConsult.id,
            staffProfileId: additionalStaff.get('cardiologistAmara')!.id,
            status: AppointmentStatus.CONFIRMED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(2, 13, 0),
            durationMinutes: 40,
            basePrice: '140.00',
            notes: 'Cardiology consultation confirmed for blood pressure and exertional symptoms.',
        },
        {
            patientId: extraPatients[24].id,
            departmentId: departmentsAndServices.departments.primaryCare.id,
            serviceCatalogId: departmentsAndServices.services.followUp.id,
            staffProfileId: additionalStaff.get('primaryDoctorLeila')!.id,
            status: AppointmentStatus.COMPLETED,
            appointmentType: AppointmentType.FOLLOW_UP,
            scheduledAt: utcAt(-3, 15, 0),
            durationMinutes: 20,
            basePrice: '55.00',
            notes: 'Asthma follow-up completed.',
        },
        {
            patientId: extraPatients[25].id,
            departmentId: dental.id,
            serviceCatalogId: dentalCleaning.id,
            staffProfileId: additionalStaff.get('dentistLayla')!.id,
            status: AppointmentStatus.CONFIRMED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(7, 9, 0),
            durationMinutes: 40,
            basePrice: '95.00',
            notes: 'Dental cleaning confirmed.',
        },
        {
            patientId: extraPatients[26].id,
            departmentId: mentalHealth.id,
            serviceCatalogId: psychiatryFollowUp.id,
            staffProfileId: additionalStaff.get('psychiatristRavi')!.id,
            status: AppointmentStatus.COMPLETED,
            appointmentType: AppointmentType.VIRTUAL,
            scheduledAt: utcAt(-6, 16, 0),
            durationMinutes: 30,
            basePrice: '125.00',
            notes: 'Psychiatry follow-up completed.',
        },
        {
            patientId: extraPatients[27].id,
            departmentId: oncology.id,
            serviceCatalogId: cancerScreening.id,
            staffProfileId: additionalStaff.get('oncologistJames')!.id,
            status: AppointmentStatus.SCHEDULED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(8, 11, 30),
            durationMinutes: 30,
            basePrice: '95.00',
            notes: 'Cancer screening coordination scheduled.',
        },
        {
            patientId: extraPatients[28].id,
            departmentId: rehabilitation.id,
            serviceCatalogId: rehabFollowUp.id,
            staffProfileId: additionalStaff.get('therapistJonas')!.id,
            status: AppointmentStatus.CHECKED_IN,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(1, 16, 0),
            durationMinutes: 30,
            basePrice: '75.00',
            notes: 'Rehabilitation follow-up checked in.',
        },
        {
            patientId: extraPatients[29].id,
            departmentId: ophthalmology.id,
            serviceCatalogId: retinalScreening.id,
            staffProfileId: additionalStaff.get('ophthalmologistAna')!.id,
            status: AppointmentStatus.CONFIRMED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(2, 15, 0),
            durationMinutes: 25,
            basePrice: '115.00',
            notes: 'Retinal screening confirmed.',
        },
        {
            patientId: extraPatients[30].id,
            departmentId: pediatrics.id,
            serviceCatalogId: childWellness.id,
            staffProfileId: additionalStaff.get('pediatricianMateo')!.id,
            status: AppointmentStatus.COMPLETED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(-1, 13, 0),
            durationMinutes: 30,
            basePrice: '80.00',
            notes: 'Child wellness check completed.',
        },
        {
            patientId: extraPatients[31].id,
            departmentId: endocrinology.id,
            serviceCatalogId: thyroidConsult.id,
            staffProfileId: additionalStaff.get('endocrinologistMaya')!.id,
            status: AppointmentStatus.CONFIRMED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(5, 14, 30),
            durationMinutes: 35,
            basePrice: '125.00',
            notes: 'Thyroid consultation confirmed.',
        },
        {
            patientId: extraPatients[32].id,
            departmentId: cardiology.id,
            serviceCatalogId: ecg.id,
            staffProfileId: additionalStaff.get('cardiologistAmara')!.id,
            status: AppointmentStatus.COMPLETED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(-4, 12, 30),
            durationMinutes: 20,
            basePrice: '65.00',
            notes: 'ECG completed for exertional symptom review.',
        },
        {
            patientId: extraPatients[33].id,
            departmentId: dermatology.id,
            serviceCatalogId: acneCare.id,
            staffProfileId: additionalStaff.get('dermatologistHiro')!.id,
            status: AppointmentStatus.CONFIRMED,
            appointmentType: AppointmentType.IN_PERSON,
            scheduledAt: utcAt(6, 15, 30),
            durationMinutes: 25,
            basePrice: '85.00',
            notes: 'Acne and rash visit confirmed.',
        },
    ];

    const broadAppointments = [];

    for (const [index, fixture] of broadAppointmentFixtures.entries()) {
        const appointment = await upsertAppointment({
            id: fixtureUuid('b3000000', index + 1),
            patientId: fixture.patientId,
            departmentId: fixture.departmentId,
            serviceCatalogId: fixture.serviceCatalogId,
            staffProfileId: fixture.staffProfileId,
            status: fixture.status,
            appointmentType: fixture.appointmentType,
            scheduledAt: fixture.scheduledAt,
            endAt: addMinutes(fixture.scheduledAt, fixture.durationMinutes),
            durationMinutes: fixture.durationMinutes,
            basePrice: fixture.basePrice,
            notes: fixture.notes,
            checkedInAt:
                fixture.status === AppointmentStatus.CHECKED_IN ||
                fixture.status === AppointmentStatus.IN_PROGRESS ||
                fixture.status === AppointmentStatus.COMPLETED
                    ? addMinutes(fixture.scheduledAt, -8)
                    : null,
            completedAt:
                fixture.status === AppointmentStatus.COMPLETED
                    ? addMinutes(fixture.scheduledAt, fixture.durationMinutes - 3)
                    : null,
            cancelledAt: fixture.cancelledAt ?? null,
            cancellationNote: fixture.cancellationNote ?? null,
        });

        broadAppointments.push({
            ...appointment,
            basePrice: fixture.basePrice,
        });
    }

    const recordFixtures = [
        {
            id: fixtureUuid('a3000000', 1),
            patientId: extraPatients[0].id,
            appointmentId: cardioCompleted.id,
            staffProfileId: cardiologist.id,
            departmentId: cardiology.id,
            chiefComplaint: 'Intermittent chest tightness during exercise',
            vitals: { bloodPressure: '126/78', heartRate: 68, oxygenSaturation: 99 },
            diagnosis: 'Hyperlipidemia with normal resting ECG',
            treatmentPlan: 'Start statin therapy and repeat lipid panel in 3 months.',
            notes: 'ECG normal sinus rhythm.',
            followUpInstructions: 'Return for cardiology review in 8 weeks.',
            isFinalized: true,
        },
        {
            id: fixtureUuid('a3000000', 2),
            patientId: extraPatients[1].id,
            appointmentId: pediatricCompleted.id,
            staffProfileId: pediatrician.id,
            departmentId: pediatrics.id,
            chiefComplaint: 'Routine child wellness check',
            vitals: { heartRate: 92, temperatureC: 36.6, weightKg: 24.4 },
            diagnosis: 'Healthy child visit',
            treatmentPlan: 'Continue routine nutrition and activity plan.',
            notes: 'Growth curve tracking appropriately.',
            followUpInstructions: 'Annual wellness check due next year.',
            isFinalized: true,
        },
        {
            id: fixtureUuid('a3000000', 3),
            patientId: extraPatients[3].id,
            appointmentId: emergencyActive.id,
            staffProfileId: staff.doctor.id,
            departmentId: emergency.id,
            chiefComplaint: 'Dizziness and elevated home glucose reading',
            vitals: { bloodPressure: '138/86', heartRate: 88, glucoseMgDl: 214 },
            diagnosis: 'Hyperglycemia under assessment',
            treatmentPlan: 'Check BMP and HbA1c; hydrate and reassess.',
            notes: 'No chest pain or focal neurologic deficit reported.',
            followUpInstructions: 'Pending lab results.',
            isFinalized: false,
        },
        {
            id: fixtureUuid('a3000000', 4),
            patientId: extraPatients[7].id,
            appointmentId: pharmacyCompleted.id,
            staffProfileId: pharmacist.id,
            departmentId: departmentsAndServices.departments.pharmacy.id,
            chiefComplaint: 'Medication review',
            vitals: Prisma.JsonNull,
            diagnosis: 'Medication counseling completed',
            treatmentPlan: 'Reinforce timing and missed-dose guidance.',
            notes: 'Patient understands medication safety points.',
            followUpInstructions: 'Contact pharmacy if adverse effects occur.',
            isFinalized: true,
        },
        {
            id: fixtureUuid('a3000000', 5),
            patientId: patients.maria.id,
            appointmentId: vaccinationCompleted.id,
            staffProfileId: staff.nurse.id,
            departmentId: departmentsAndServices.departments.primaryCare.id,
            chiefComplaint: 'Seasonal vaccine',
            vitals: { temperatureC: 36.5 },
            diagnosis: 'Vaccine administered',
            treatmentPlan: 'Observed for immediate reaction.',
            notes: 'No reaction during observation period.',
            followUpInstructions: 'Return if delayed reaction occurs.',
            isFinalized: true,
        },
    ];

    for (const record of recordFixtures) {
        await prisma.medicalRecord.upsert({
            where: { id: record.id },
            update: {
                ...record,
                vitals: record.vitals as Prisma.InputJsonValue,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                ...record,
                vitals: record.vitals as Prisma.InputJsonValue,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
    }

    for (const [index, appointment] of broadAppointments
        .filter((item) =>
            item.status === AppointmentStatus.COMPLETED ||
            item.status === AppointmentStatus.IN_PROGRESS ||
            item.status === AppointmentStatus.CHECKED_IN,
        )
        .entries()) {
        await prisma.medicalRecord.upsert({
            where: { id: fixtureUuid('b3100000', index + 1) },
            update: {
                patientId: appointment.patientId,
                appointmentId: appointment.id,
                staffProfileId: appointment.staffProfileId!,
                departmentId: appointment.departmentId,
                chiefComplaint: appointment.notes,
                vitals: {
                    bloodPressure: index % 2 === 0 ? '124/78' : '132/84',
                    heartRate: 68 + index,
                    oxygenSaturation: 97 + (index % 3),
                },
                diagnosis:
                    appointment.status === AppointmentStatus.COMPLETED
                        ? 'Specialty visit completed'
                        : 'Specialty assessment in progress',
                treatmentPlan:
                    appointment.status === AppointmentStatus.COMPLETED
                        ? 'Continue care plan and follow up as recommended.'
                        : 'Complete assessment and update care plan after review.',
                notes: 'Expanded demo specialty record.',
                followUpInstructions:
                    appointment.status === AppointmentStatus.COMPLETED
                        ? 'Follow up with department if symptoms change.'
                        : 'Await clinician completion note.',
                isFinalized: appointment.status === AppointmentStatus.COMPLETED,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                id: fixtureUuid('b3100000', index + 1),
                patientId: appointment.patientId,
                appointmentId: appointment.id,
                staffProfileId: appointment.staffProfileId!,
                departmentId: appointment.departmentId,
                chiefComplaint: appointment.notes,
                vitals: {
                    bloodPressure: index % 2 === 0 ? '124/78' : '132/84',
                    heartRate: 68 + index,
                    oxygenSaturation: 97 + (index % 3),
                },
                diagnosis:
                    appointment.status === AppointmentStatus.COMPLETED
                        ? 'Specialty visit completed'
                        : 'Specialty assessment in progress',
                treatmentPlan:
                    appointment.status === AppointmentStatus.COMPLETED
                        ? 'Continue care plan and follow up as recommended.'
                        : 'Complete assessment and update care plan after review.',
                notes: 'Expanded demo specialty record.',
                followUpInstructions:
                    appointment.status === AppointmentStatus.COMPLETED
                        ? 'Follow up with department if symptoms change.'
                        : 'Await clinician completion note.',
                isFinalized: appointment.status === AppointmentStatus.COMPLETED,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
    }

    const [cbc, bmp, lipid, hba1c, tsh, crp, ua, trop, covid, lft] = await Promise.all([
        prisma.labTest.findUniqueOrThrow({ where: { code: 'CBC' } }),
        prisma.labTest.findUniqueOrThrow({ where: { code: 'BMP' } }),
        prisma.labTest.findUniqueOrThrow({ where: { code: 'LIPID' } }),
        prisma.labTest.findUniqueOrThrow({ where: { code: 'HBA1C' } }),
        prisma.labTest.findUniqueOrThrow({ where: { code: 'TSH' } }),
        prisma.labTest.findUniqueOrThrow({ where: { code: 'CRP' } }),
        prisma.labTest.findUniqueOrThrow({ where: { code: 'UA' } }),
        prisma.labTest.findUniqueOrThrow({ where: { code: 'TROP' } }),
        prisma.labTest.findUniqueOrThrow({ where: { code: 'COVID-AG' } }),
        prisma.labTest.findUniqueOrThrow({ where: { code: 'LFT' } }),
    ]);

    const labOrderCardio = await prisma.labOrder.upsert({
        where: { id: fixtureUuid('a5000000', 1) },
        update: {
            patientId: extraPatients[0].id,
            appointmentId: cardioCompleted.id,
            medicalRecordId: fixtureUuid('a3000000', 1),
            orderedByStaffId: cardiologist.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.COMPLETED,
            priority: 'normal',
            notes: 'Lipid and liver baseline completed for statin start.',
            orderedAt: utcAt(-4, 9, 25),
            collectedAt: utcAt(-4, 9, 45),
            completedAt: utcAt(-4, 12, 10),
            reviewedAt: utcAt(-4, 13, 0),
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: fixtureUuid('a5000000', 1),
            patientId: extraPatients[0].id,
            appointmentId: cardioCompleted.id,
            medicalRecordId: fixtureUuid('a3000000', 1),
            orderedByStaffId: cardiologist.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.COMPLETED,
            priority: 'normal',
            notes: 'Lipid and liver baseline completed for statin start.',
            orderedAt: utcAt(-4, 9, 25),
            collectedAt: utcAt(-4, 9, 45),
            completedAt: utcAt(-4, 12, 10),
            reviewedAt: utcAt(-4, 13, 0),
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
    await upsertLabOrderItem({
        id: fixtureUuid('a5100000', 1),
        labOrderId: labOrderCardio.id,
        labTestId: lipid.id,
        resultValue: '146',
        resultUnit: 'mg/dL',
        resultNotes: 'LDL above goal.',
        resultStatus: LabResultStatus.ABNORMAL,
        isCritical: false,
        completedAt: utcAt(-4, 12, 10),
    });
    await upsertLabOrderItem({
        id: fixtureUuid('a5100000', 2),
        labOrderId: labOrderCardio.id,
        labTestId: lft.id,
        resultValue: '28',
        resultUnit: 'U/L',
        resultNotes: 'ALT within expected range.',
        resultStatus: LabResultStatus.REVIEWED,
        isCritical: false,
        completedAt: utcAt(-4, 12, 10),
    });

    const labOrderEmergency = await prisma.labOrder.upsert({
        where: { id: fixtureUuid('a5000000', 2) },
        update: {
            patientId: extraPatients[3].id,
            appointmentId: emergencyActive.id,
            medicalRecordId: fixtureUuid('a3000000', 3),
            orderedByStaffId: staff.doctor.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.IN_PROGRESS,
            priority: 'urgent',
            notes: 'Urgent glucose and metabolic review.',
            orderedAt: utcAt(0, 15, 10),
            collectedAt: utcAt(0, 15, 18),
            completedAt: null,
            reviewedAt: null,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: fixtureUuid('a5000000', 2),
            patientId: extraPatients[3].id,
            appointmentId: emergencyActive.id,
            medicalRecordId: fixtureUuid('a3000000', 3),
            orderedByStaffId: staff.doctor.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.IN_PROGRESS,
            priority: 'urgent',
            notes: 'Urgent glucose and metabolic review.',
            orderedAt: utcAt(0, 15, 10),
            collectedAt: utcAt(0, 15, 18),
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
    await upsertLabOrderItem({
        id: fixtureUuid('a5100000', 3),
        labOrderId: labOrderEmergency.id,
        labTestId: bmp.id,
        resultValue: null,
        resultUnit: null,
        resultNotes: null,
        resultStatus: LabResultStatus.PENDING,
        isCritical: false,
        completedAt: null,
    });
    await upsertLabOrderItem({
        id: fixtureUuid('a5100000', 4),
        labOrderId: labOrderEmergency.id,
        labTestId: hba1c.id,
        resultValue: null,
        resultUnit: null,
        resultNotes: null,
        resultStatus: LabResultStatus.PENDING,
        isCritical: false,
        completedAt: null,
    });

    const labOrderCollection = await prisma.labOrder.upsert({
        where: { id: fixtureUuid('a5000000', 3) },
        update: {
            patientId: extraPatients[6].id,
            appointmentId: labCollection.id,
            medicalRecordId: null,
            orderedByStaffId: labTechnician.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.COLLECTED,
            priority: 'normal',
            notes: 'Lab-only collection for CBC, CRP, and urinalysis.',
            orderedAt: utcAt(0, 8, 25),
            collectedAt: utcAt(0, 8, 36),
            completedAt: null,
            reviewedAt: null,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: fixtureUuid('a5000000', 3),
            patientId: extraPatients[6].id,
            appointmentId: labCollection.id,
            orderedByStaffId: labTechnician.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.COLLECTED,
            priority: 'normal',
            notes: 'Lab-only collection for CBC, CRP, and urinalysis.',
            orderedAt: utcAt(0, 8, 25),
            collectedAt: utcAt(0, 8, 36),
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
    for (const [index, test] of [cbc, crp, ua].entries()) {
        await upsertLabOrderItem({
            id: fixtureUuid('a5100000', index + 5),
            labOrderId: labOrderCollection.id,
            labTestId: test.id,
            resultValue: null,
            resultUnit: null,
            resultNotes: null,
            resultStatus: LabResultStatus.PENDING,
            isCritical: false,
            completedAt: null,
        });
    }

    const labOrderCritical = await prisma.labOrder.upsert({
        where: { id: fixtureUuid('a5000000', 4) },
        update: {
            patientId: extraPatients[4].id,
            appointmentId: cardioFuture.id,
            medicalRecordId: null,
            orderedByStaffId: cardiologist.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.COMPLETED,
            priority: 'stat',
            notes: 'Critical-result demo row for alert workflow.',
            orderedAt: utcAt(-2, 8, 0),
            collectedAt: utcAt(-2, 8, 15),
            completedAt: utcAt(-2, 8, 55),
            reviewedAt: null,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: fixtureUuid('a5000000', 4),
            patientId: extraPatients[4].id,
            appointmentId: cardioFuture.id,
            orderedByStaffId: cardiologist.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.COMPLETED,
            priority: 'stat',
            notes: 'Critical-result demo row for alert workflow.',
            orderedAt: utcAt(-2, 8, 0),
            collectedAt: utcAt(-2, 8, 15),
            completedAt: utcAt(-2, 8, 55),
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
    await upsertLabOrderItem({
        id: fixtureUuid('a5100000', 8),
        labOrderId: labOrderCritical.id,
        labTestId: trop.id,
        resultValue: '0.12',
        resultUnit: 'ng/mL',
        resultNotes: 'Above critical threshold; physician review required.',
        resultStatus: LabResultStatus.CRITICAL,
        isCritical: true,
        completedAt: utcAt(-2, 8, 55),
    });

    const labOrderPeds = await prisma.labOrder.upsert({
        where: { id: fixtureUuid('a5000000', 5) },
        update: {
            patientId: extraPatients[1].id,
            appointmentId: pediatricCompleted.id,
            medicalRecordId: fixtureUuid('a3000000', 2),
            orderedByStaffId: pediatrician.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.COMPLETED,
            priority: 'normal',
            notes: 'Rapid respiratory screen completed.',
            orderedAt: utcAt(-2, 11, 20),
            collectedAt: utcAt(-2, 11, 34),
            completedAt: utcAt(-2, 11, 52),
            reviewedAt: utcAt(-2, 12, 15),
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            id: fixtureUuid('a5000000', 5),
            patientId: extraPatients[1].id,
            appointmentId: pediatricCompleted.id,
            medicalRecordId: fixtureUuid('a3000000', 2),
            orderedByStaffId: pediatrician.id,
            departmentId: departmentsAndServices.departments.diagnostics.id,
            status: LabOrderStatus.COMPLETED,
            priority: 'normal',
            notes: 'Rapid respiratory screen completed.',
            orderedAt: utcAt(-2, 11, 20),
            collectedAt: utcAt(-2, 11, 34),
            completedAt: utcAt(-2, 11, 52),
            reviewedAt: utcAt(-2, 12, 15),
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });
    await upsertLabOrderItem({
        id: fixtureUuid('a5100000', 9),
        labOrderId: labOrderPeds.id,
        labTestId: covid.id,
        resultValue: 'Negative',
        resultUnit: null,
        resultNotes: 'Rapid antigen negative.',
        resultStatus: LabResultStatus.REVIEWED,
        isCritical: false,
        completedAt: utcAt(-2, 11, 52),
    });

    const broadLabOrderFixtures = [
        {
            appointment: broadAppointments[1],
            status: LabOrderStatus.COMPLETED,
            priority: 'normal',
            notes: 'Diabetes monitoring labs completed.',
            orderedAt: utcAt(-3, 10, 35),
            collectedAt: utcAt(-3, 10, 55),
            completedAt: utcAt(-3, 13, 10),
            reviewedAt: utcAt(-3, 14, 0),
            items: [
                {
                    testId: hba1c.id,
                    resultValue: '7.4',
                    resultUnit: '%',
                    resultNotes: 'Above individualized goal; medication review recommended.',
                    resultStatus: LabResultStatus.ABNORMAL,
                    isCritical: false,
                },
                {
                    testId: bmp.id,
                    resultValue: '102',
                    resultUnit: 'mg/dL',
                    resultNotes: 'Glucose mildly elevated.',
                    resultStatus: LabResultStatus.REVIEWED,
                    isCritical: false,
                },
            ],
        },
        {
            appointment: broadAppointments[8],
            status: LabOrderStatus.IN_PROGRESS,
            priority: 'normal',
            notes: 'Thyroid function panel in progress.',
            orderedAt: utcAt(0, 14, 25),
            collectedAt: utcAt(0, 14, 45),
            completedAt: null,
            reviewedAt: null,
            items: [
                {
                    testId: tsh.id,
                    resultValue: null,
                    resultUnit: null,
                    resultNotes: null,
                    resultStatus: LabResultStatus.PENDING,
                    isCritical: false,
                },
            ],
        },
        {
            appointment: broadAppointments[17],
            status: LabOrderStatus.PENDING,
            priority: 'normal',
            notes: 'Screening baseline lab panel pending collection.',
            orderedAt: utcAt(1, 9, 20),
            collectedAt: null,
            completedAt: null,
            reviewedAt: null,
            items: [
                {
                    testId: cbc.id,
                    resultValue: null,
                    resultUnit: null,
                    resultNotes: null,
                    resultStatus: LabResultStatus.PENDING,
                    isCritical: false,
                },
                {
                    testId: lft.id,
                    resultValue: null,
                    resultUnit: null,
                    resultNotes: null,
                    resultStatus: LabResultStatus.PENDING,
                    isCritical: false,
                },
            ],
        },
        {
            appointment: broadAppointments[22],
            status: LabOrderStatus.COMPLETED,
            priority: 'stat',
            notes: 'Cardiology marker panel completed after ECG.',
            orderedAt: utcAt(-4, 12, 20),
            collectedAt: utcAt(-4, 12, 35),
            completedAt: utcAt(-4, 13, 5),
            reviewedAt: utcAt(-4, 13, 25),
            items: [
                {
                    testId: trop.id,
                    resultValue: '0.02',
                    resultUnit: 'ng/mL',
                    resultNotes: 'Within expected range.',
                    resultStatus: LabResultStatus.REVIEWED,
                    isCritical: false,
                },
            ],
        },
    ];

    for (const [index, fixture] of broadLabOrderFixtures.entries()) {
        const labOrder = await prisma.labOrder.upsert({
            where: { id: fixtureUuid('b5000000', index + 1) },
            update: {
                patientId: fixture.appointment.patientId,
                appointmentId: fixture.appointment.id,
                medicalRecordId: null,
                orderedByStaffId: fixture.appointment.staffProfileId!,
                departmentId: departmentsAndServices.departments.diagnostics.id,
                status: fixture.status,
                priority: fixture.priority,
                notes: fixture.notes,
                orderedAt: fixture.orderedAt,
                collectedAt: fixture.collectedAt,
                completedAt: fixture.completedAt,
                reviewedAt: fixture.reviewedAt,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                id: fixtureUuid('b5000000', index + 1),
                patientId: fixture.appointment.patientId,
                appointmentId: fixture.appointment.id,
                orderedByStaffId: fixture.appointment.staffProfileId!,
                departmentId: departmentsAndServices.departments.diagnostics.id,
                status: fixture.status,
                priority: fixture.priority,
                notes: fixture.notes,
                orderedAt: fixture.orderedAt,
                collectedAt: fixture.collectedAt,
                completedAt: fixture.completedAt,
                reviewedAt: fixture.reviewedAt,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });

        for (const [itemIndex, item] of fixture.items.entries()) {
            await upsertLabOrderItem({
                id: fixtureUuid('b5100000', index * 10 + itemIndex + 1),
                labOrderId: labOrder.id,
                labTestId: item.testId,
                resultValue: item.resultValue,
                resultUnit: item.resultUnit,
                resultNotes: item.resultNotes,
                resultStatus: item.resultStatus,
                isCritical: item.isCritical,
                completedAt: fixture.completedAt,
            });
        }
    }

    const prescriptions = [
        {
            prescriptionId: fixtureUuid('a4000000', 1),
            itemId: fixtureUuid('a4100000', 1),
            queueId: fixtureUuid('a4200000', 1),
            dispensingId: fixtureUuid('a4300000', 1),
            patientId: extraPatients[0].id,
            appointmentId: cardioCompleted.id,
            medicalRecordId: fixtureUuid('a3000000', 1),
            staffProfileId: cardiologist.id,
            inventoryItemId: inventoryMap.get('MED-ATOR-20')?.id ?? inventory.amoxicillin.id,
            medicationName: 'Atorvastatin 20mg',
            dosage: '20mg',
            frequency: 'Once nightly',
            durationInstructions: '90 days',
            quantityPrescribed: 90,
            quantityDispensed: 90,
            queueStatus: PharmacyStatus.DISPENSED,
            requestedAt: utcAt(-4, 13, 15),
            processedAt: utcAt(-4, 14, 10),
        },
        {
            prescriptionId: fixtureUuid('a4000000', 2),
            itemId: fixtureUuid('a4100000', 2),
            queueId: fixtureUuid('a4200000', 2),
            dispensingId: fixtureUuid('a4300000', 2),
            patientId: extraPatients[3].id,
            appointmentId: emergencyActive.id,
            medicalRecordId: fixtureUuid('a3000000', 3),
            staffProfileId: staff.doctor.id,
            inventoryItemId: inventoryMap.get('MED-SALB-100')?.id ?? inventory.amoxicillin.id,
            medicationName: 'Salbutamol Inhaler 100mcg',
            dosage: '2 puffs',
            frequency: 'As needed',
            durationInstructions: 'Use for wheeze or shortness of breath',
            quantityPrescribed: 1,
            quantityDispensed: 0,
            queueStatus: PharmacyStatus.IN_PROGRESS,
            requestedAt: utcAt(0, 15, 35),
            processedAt: null,
        },
        {
            prescriptionId: fixtureUuid('a4000000', 3),
            itemId: fixtureUuid('a4100000', 3),
            queueId: fixtureUuid('a4200000', 3),
            dispensingId: fixtureUuid('a4300000', 3),
            patientId: extraPatients[1].id,
            appointmentId: pediatricCompleted.id,
            medicalRecordId: fixtureUuid('a3000000', 2),
            staffProfileId: pediatrician.id,
            inventoryItemId: inventoryMap.get('MED-PARA-500')?.id ?? inventory.amoxicillin.id,
            medicationName: 'Paracetamol 500mg',
            dosage: '250mg',
            frequency: 'Every 6 hours as needed',
            durationInstructions: 'Up to 3 days',
            quantityPrescribed: 12,
            quantityDispensed: 12,
            queueStatus: PharmacyStatus.FULFILLED,
            requestedAt: utcAt(-2, 12, 5),
            processedAt: utcAt(-2, 12, 40),
        },
    ];

    for (const prescriptionFixture of prescriptions) {
        const prescription = await prisma.prescription.upsert({
            where: { id: prescriptionFixture.prescriptionId },
            update: {
                patientId: prescriptionFixture.patientId,
                medicalRecordId: prescriptionFixture.medicalRecordId,
                appointmentId: prescriptionFixture.appointmentId,
                staffProfileId: prescriptionFixture.staffProfileId,
                issuedAt: prescriptionFixture.requestedAt,
                expiresAt: addUtcDays(prescriptionFixture.requestedAt, 90),
                notes: 'Expanded demo prescription.',
                isVoided: false,
                voidedAt: null,
                voidReason: null,
                voidedByUserId: null,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                id: prescriptionFixture.prescriptionId,
                patientId: prescriptionFixture.patientId,
                medicalRecordId: prescriptionFixture.medicalRecordId,
                appointmentId: prescriptionFixture.appointmentId,
                staffProfileId: prescriptionFixture.staffProfileId,
                issuedAt: prescriptionFixture.requestedAt,
                expiresAt: addUtcDays(prescriptionFixture.requestedAt, 90),
                notes: 'Expanded demo prescription.',
                isVoided: false,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
        const item = await prisma.prescriptionItem.upsert({
            where: { id: prescriptionFixture.itemId },
            update: {
                prescriptionId: prescription.id,
                medicationName: prescriptionFixture.medicationName,
                dosage: prescriptionFixture.dosage,
                frequency: prescriptionFixture.frequency,
                durationInstructions: prescriptionFixture.durationInstructions,
                quantityPrescribed: prescriptionFixture.quantityPrescribed,
                quantityDispensed: prescriptionFixture.quantityDispensed,
                notes: 'Expanded demo medication line.',
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                id: prescriptionFixture.itemId,
                prescriptionId: prescription.id,
                medicationName: prescriptionFixture.medicationName,
                dosage: prescriptionFixture.dosage,
                frequency: prescriptionFixture.frequency,
                durationInstructions: prescriptionFixture.durationInstructions,
                quantityPrescribed: prescriptionFixture.quantityPrescribed,
                quantityDispensed: prescriptionFixture.quantityDispensed,
                notes: 'Expanded demo medication line.',
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
        const queue = await prisma.pharmacyQueue.upsert({
            where: { id: prescriptionFixture.queueId },
            update: {
                prescriptionId: prescription.id,
                patientId: prescriptionFixture.patientId,
                status: prescriptionFixture.queueStatus,
                requestedAt: prescriptionFixture.requestedAt,
                processedAt: prescriptionFixture.processedAt,
                notes: 'Expanded demo pharmacy queue row.',
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                id: prescriptionFixture.queueId,
                prescriptionId: prescription.id,
                patientId: prescriptionFixture.patientId,
                status: prescriptionFixture.queueStatus,
                requestedAt: prescriptionFixture.requestedAt,
                processedAt: prescriptionFixture.processedAt,
                notes: 'Expanded demo pharmacy queue row.',
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });

        await prisma.pharmacyDispensingItem.upsert({
            where: { id: prescriptionFixture.dispensingId },
            update: {
                pharmacyQueueId: queue.id,
                prescriptionItemId: item.id,
                inventoryItemId: prescriptionFixture.inventoryItemId,
                quantityToDispense: prescriptionFixture.quantityPrescribed,
                quantityDispensed: prescriptionFixture.quantityDispensed || null,
                status: prescriptionFixture.queueStatus,
                notes: 'Expanded demo dispensing item.',
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                id: prescriptionFixture.dispensingId,
                pharmacyQueueId: queue.id,
                prescriptionItemId: item.id,
                inventoryItemId: prescriptionFixture.inventoryItemId,
                quantityToDispense: prescriptionFixture.quantityPrescribed,
                quantityDispensed: prescriptionFixture.quantityDispensed || null,
                status: prescriptionFixture.queueStatus,
                notes: 'Expanded demo dispensing item.',
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
    }

    const billingFixtures = [
        {
            id: fixtureUuid('a6000000', 1),
            itemId: fixtureUuid('a6100000', 1),
            paymentId: fixtureUuid('a6200000', 1),
            patientId: extraPatients[0].id,
            appointmentId: cardioCompleted.id,
            billingNumber: 'BILL-DEMO-0101',
            status: BillingStatus.PARTIALLY_PAID,
            serviceCatalogId: ecg.id,
            description: 'ECG and cardiology review support',
            subtotal: '65.00',
            totalAmount: '65.00',
            amountPaid: '25.00',
            paymentAmount: '25.00',
            paymentMethod: PaymentMethod.ONLINE,
            issuedAt: utcAt(-4, 13, 30),
            dueDate: utcAt(10, 0, 0),
            paidAt: utcAt(-4, 14, 0),
        },
        {
            id: fixtureUuid('a6000000', 2),
            itemId: fixtureUuid('a6100000', 2),
            paymentId: null,
            patientId: extraPatients[4].id,
            appointmentId: cardioFuture.id,
            billingNumber: 'BILL-DEMO-0102',
            status: BillingStatus.OVERDUE,
            serviceCatalogId: cardiologyConsult.id,
            description: 'Cardiology consultation deposit',
            subtotal: '140.00',
            totalAmount: '140.00',
            amountPaid: '0.00',
            paymentAmount: null,
            paymentMethod: PaymentMethod.OTHER,
            issuedAt: utcAt(-20, 9, 0),
            dueDate: utcAt(-5, 0, 0),
            paidAt: null,
        },
        {
            id: fixtureUuid('a6000000', 3),
            itemId: fixtureUuid('a6100000', 3),
            paymentId: fixtureUuid('a6200000', 3),
            patientId: extraPatients[1].id,
            appointmentId: pediatricCompleted.id,
            billingNumber: 'BILL-DEMO-0103',
            status: BillingStatus.PAID,
            serviceCatalogId: childWellness.id,
            description: 'Child wellness check',
            subtotal: '80.00',
            totalAmount: '80.00',
            amountPaid: '80.00',
            paymentAmount: '80.00',
            paymentMethod: PaymentMethod.CARD,
            issuedAt: utcAt(-2, 12, 20),
            dueDate: utcAt(7, 0, 0),
            paidAt: utcAt(-2, 12, 50),
        },
        {
            id: fixtureUuid('a6000000', 4),
            itemId: fixtureUuid('a6100000', 4),
            paymentId: null,
            patientId: extraPatients[3].id,
            appointmentId: emergencyActive.id,
            billingNumber: 'BILL-DEMO-0104',
            status: BillingStatus.DRAFT,
            serviceCatalogId: urgentAssessment.id,
            description: 'Urgent walk-in assessment',
            subtotal: '120.00',
            totalAmount: '120.00',
            amountPaid: '0.00',
            paymentAmount: null,
            paymentMethod: PaymentMethod.OTHER,
            issuedAt: utcAt(0, 15, 45),
            dueDate: utcAt(14, 0, 0),
            paidAt: null,
        },
        {
            id: fixtureUuid('a6000000', 5),
            itemId: fixtureUuid('a6100000', 5),
            paymentId: fixtureUuid('a6200000', 5),
            patientId: patients.maria.id,
            appointmentId: vaccinationCompleted.id,
            billingNumber: 'BILL-DEMO-0105',
            status: BillingStatus.PAID,
            serviceCatalogId: vaccination.id,
            description: 'Vaccination visit',
            subtotal: '40.00',
            totalAmount: '40.00',
            amountPaid: '40.00',
            paymentAmount: '40.00',
            paymentMethod: PaymentMethod.CASH,
            issuedAt: utcAt(-6, 10, 25),
            dueDate: utcAt(7, 0, 0),
            paidAt: utcAt(-6, 10, 35),
        },
        {
            id: fixtureUuid('a6000000', 6),
            itemId: fixtureUuid('a6100000', 6),
            paymentId: null,
            patientId: patients.john.id,
            appointmentId: billingDeskVisit.id,
            billingNumber: 'BILL-DEMO-0106',
            status: BillingStatus.PENDING,
            serviceCatalogId: insuranceVerification.id,
            description: 'Insurance verification',
            subtotal: '20.00',
            totalAmount: '20.00',
            amountPaid: '0.00',
            paymentAmount: null,
            paymentMethod: PaymentMethod.OTHER,
            issuedAt: utcAt(-7, 15, 30),
            dueDate: utcAt(7, 0, 0),
            paidAt: null,
        },
    ];

    for (const billingFixture of billingFixtures) {
        const billing = await prisma.billing.upsert({
            where: { id: billingFixture.id },
            update: {
                patientId: billingFixture.patientId,
                appointmentId: billingFixture.appointmentId,
                billingNumber: billingFixture.billingNumber,
                status: billingFixture.status,
                subtotal: billingFixture.subtotal,
                taxAmount: '0.00',
                discountAmount: '0.00',
                totalAmount: billingFixture.totalAmount,
                amountPaid: billingFixture.amountPaid,
                dueDate: billingFixture.dueDate,
                issuedAt: billingFixture.issuedAt,
                paidAt: billingFixture.paidAt,
                notes: 'Expanded demo billing row.',
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                id: billingFixture.id,
                patientId: billingFixture.patientId,
                appointmentId: billingFixture.appointmentId,
                billingNumber: billingFixture.billingNumber,
                status: billingFixture.status,
                subtotal: billingFixture.subtotal,
                taxAmount: '0.00',
                discountAmount: '0.00',
                totalAmount: billingFixture.totalAmount,
                amountPaid: billingFixture.amountPaid,
                dueDate: billingFixture.dueDate,
                issuedAt: billingFixture.issuedAt,
                paidAt: billingFixture.paidAt,
                notes: 'Expanded demo billing row.',
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
        await prisma.billingItem.upsert({
            where: { id: billingFixture.itemId },
            update: {
                billingId: billing.id,
                serviceCatalogId: billingFixture.serviceCatalogId,
                inventoryItemId: null,
                description: billingFixture.description,
                quantity: '1',
                unitPrice: billingFixture.subtotal,
                totalPrice: billingFixture.totalAmount,
                sourceEntityType: 'appointment',
                sourceEntityId: billingFixture.appointmentId,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                id: billingFixture.itemId,
                billingId: billing.id,
                serviceCatalogId: billingFixture.serviceCatalogId,
                inventoryItemId: null,
                description: billingFixture.description,
                quantity: '1',
                unitPrice: billingFixture.subtotal,
                totalPrice: billingFixture.totalAmount,
                sourceEntityType: 'appointment',
                sourceEntityId: billingFixture.appointmentId,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
        if (billingFixture.paymentId && billingFixture.paymentAmount && billingFixture.paidAt) {
            await prisma.payment.upsert({
                where: { id: billingFixture.paymentId },
                update: {
                    billingId: billing.id,
                    amount: billingFixture.paymentAmount,
                    paymentMethod: billingFixture.paymentMethod,
                    referenceNumber: `PAY-${billingFixture.billingNumber}`,
                    paidAt: billingFixture.paidAt,
                    receivedByUserId: staff.receptionist.userId,
                    notes: 'Expanded demo payment.',
                    updatedBy: ACTOR_USER_ID,
                },
                create: {
                    id: billingFixture.paymentId,
                    billingId: billing.id,
                    amount: billingFixture.paymentAmount,
                    paymentMethod: billingFixture.paymentMethod,
                    referenceNumber: `PAY-${billingFixture.billingNumber}`,
                    paidAt: billingFixture.paidAt,
                    receivedByUserId: staff.receptionist.userId,
                    notes: 'Expanded demo payment.',
                    createdBy: ACTOR_USER_ID,
                    updatedBy: ACTOR_USER_ID,
                },
            });
        }
    }

    for (const [index, appointment] of broadAppointments.entries()) {
        const isCompleted = appointment.status === AppointmentStatus.COMPLETED;
        const isCancelled = appointment.status === AppointmentStatus.CANCELLED;
        const isActive =
            appointment.status === AppointmentStatus.CHECKED_IN ||
            appointment.status === AppointmentStatus.IN_PROGRESS;
        const billingStatus = isCompleted
            ? BillingStatus.PAID
            : isCancelled
                ? BillingStatus.CANCELLED
                : isActive
                    ? BillingStatus.DRAFT
                    : BillingStatus.PENDING;
        const amountPaid = isCompleted ? appointment.basePrice : '0.00';
        const billingId = fixtureUuid('b6000000', index + 1);
        const billingNumber = `BILL-SPECIALTY-${String(index + 1).padStart(3, '0')}`;

        const billing = await prisma.billing.upsert({
            where: { id: billingId },
            update: {
                patientId: appointment.patientId,
                appointmentId: appointment.id,
                billingNumber,
                status: billingStatus,
                subtotal: appointment.basePrice,
                taxAmount: '0.00',
                discountAmount: '0.00',
                totalAmount: appointment.basePrice,
                amountPaid,
                dueDate: addUtcDays(appointment.scheduledAt, 14),
                issuedAt: appointment.completedAt ?? appointment.scheduledAt,
                paidAt: isCompleted ? appointment.completedAt : null,
                notes: 'Expanded specialty appointment billing row.',
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                id: billingId,
                patientId: appointment.patientId,
                appointmentId: appointment.id,
                billingNumber,
                status: billingStatus,
                subtotal: appointment.basePrice,
                taxAmount: '0.00',
                discountAmount: '0.00',
                totalAmount: appointment.basePrice,
                amountPaid,
                dueDate: addUtcDays(appointment.scheduledAt, 14),
                issuedAt: appointment.completedAt ?? appointment.scheduledAt,
                paidAt: isCompleted ? appointment.completedAt : null,
                notes: 'Expanded specialty appointment billing row.',
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });

        await prisma.billingItem.upsert({
            where: { id: fixtureUuid('b6100000', index + 1) },
            update: {
                billingId: billing.id,
                serviceCatalogId: appointment.serviceCatalogId,
                inventoryItemId: null,
                description: `Specialty appointment - ${appointment.notes}`,
                quantity: '1',
                unitPrice: appointment.basePrice,
                totalPrice: appointment.basePrice,
                sourceEntityType: 'appointment',
                sourceEntityId: appointment.id,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                id: fixtureUuid('b6100000', index + 1),
                billingId: billing.id,
                serviceCatalogId: appointment.serviceCatalogId,
                inventoryItemId: null,
                description: `Specialty appointment - ${appointment.notes}`,
                quantity: '1',
                unitPrice: appointment.basePrice,
                totalPrice: appointment.basePrice,
                sourceEntityType: 'appointment',
                sourceEntityId: appointment.id,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });

        if (isCompleted && appointment.completedAt) {
            await prisma.payment.upsert({
                where: { id: fixtureUuid('b6200000', index + 1) },
                update: {
                    billingId: billing.id,
                    amount: appointment.basePrice,
                    paymentMethod: index % 2 === 0 ? PaymentMethod.CARD : PaymentMethod.ONLINE,
                    referenceNumber: `PAY-${billingNumber}`,
                    paidAt: appointment.completedAt,
                    receivedByUserId: staff.receptionist.userId,
                    notes: 'Expanded specialty appointment payment.',
                    updatedBy: ACTOR_USER_ID,
                },
                create: {
                    id: fixtureUuid('b6200000', index + 1),
                    billingId: billing.id,
                    amount: appointment.basePrice,
                    paymentMethod: index % 2 === 0 ? PaymentMethod.CARD : PaymentMethod.ONLINE,
                    referenceNumber: `PAY-${billingNumber}`,
                    paidAt: appointment.completedAt,
                    receivedByUserId: staff.receptionist.userId,
                    notes: 'Expanded specialty appointment payment.',
                    createdBy: ACTOR_USER_ID,
                    updatedBy: ACTOR_USER_ID,
                },
            });
        }
    }

    const feedbackFixtures = [
        {
            id: fixtureUuid('a7000000', 1),
            patientId: extraPatients[0].id,
            appointmentId: cardioCompleted.id,
            rating: 5,
            comment: 'The cardiology visit was clear and reassuring.',
            status: 'published',
            isAnonymous: false,
            submittedAt: utcAt(-4, 16, 0),
        },
        {
            id: fixtureUuid('a7000000', 2),
            patientId: extraPatients[1].id,
            appointmentId: pediatricCompleted.id,
            rating: 5,
            comment: 'Dr. Kovalenko was patient and kind with my child.',
            status: 'published',
            isAnonymous: false,
            submittedAt: utcAt(-2, 17, 0),
        },
        {
            id: fixtureUuid('a7000000', 3),
            patientId: extraPatients[7].id,
            appointmentId: pharmacyCompleted.id,
            rating: 4,
            comment: 'Helpful medication advice, small wait at pharmacy.',
            status: 'pending',
            isAnonymous: false,
            submittedAt: utcAt(-5, 16, 0),
        },
        {
            id: fixtureUuid('a7000000', 4),
            patientId: patients.maria.id,
            appointmentId: vaccinationCompleted.id,
            rating: 5,
            comment: 'Quick vaccination visit.',
            status: 'published',
            isAnonymous: true,
            submittedAt: utcAt(-6, 12, 0),
        },
    ];

    for (const feedback of feedbackFixtures) {
        await prisma.feedback.upsert({
            where: { id: feedback.id },
            update: {
                ...feedback,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                ...feedback,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
    }

    const contactMessages = [
        {
            id: fixtureUuid('a8000000', 1),
            name: 'Isabella Martin',
            email: 'isabella.martin@example.local',
            phone: '+33 1 5550 0120',
            subject: 'Insurance question',
            message: 'Do you support direct billing for international insurance plans?',
            status: 'new',
        },
        {
            id: fixtureUuid('a8000000', 2),
            name: 'Arben Gashi',
            email: 'arben.gashi@example.local',
            phone: '+383 44 100 120',
            subject: 'Pediatric appointment',
            message: 'Can I book a child wellness check and vaccine on the same day?',
            status: 'in_progress',
        },
        {
            id: fixtureUuid('a8000000', 3),
            name: 'Nadia Petrova',
            email: 'nadia.petrova@example.local',
            phone: '+359 2 555 0121',
            subject: 'Lab turnaround time',
            message: 'How long does HbA1c testing usually take?',
            status: 'resolved',
        },
    ];

    for (const message of contactMessages) {
        await prisma.contactMessage.upsert({
            where: { id: message.id },
            update: {
                ...message,
                replyNotes: message.status === 'resolved' ? 'Shared expected turnaround time.' : null,
                repliedAt: message.status === 'resolved' ? utcAt(-1, 10, 0) : null,
                updatedBy: ACTOR_USER_ID,
            },
            create: {
                ...message,
                replyNotes: message.status === 'resolved' ? 'Shared expected turnaround time.' : null,
                repliedAt: message.status === 'resolved' ? utcAt(-1, 10, 0) : null,
                createdBy: ACTOR_USER_ID,
                updatedBy: ACTOR_USER_ID,
            },
        });
    }

    const auditFixtures = [
        {
            id: fixtureUuid('a9000000', 1),
            entityType: 'departments',
            entityId: radiology.id,
            action: 'departments.created',
            performedByUserId: clinicAdmin.userId,
            newValue: { name: radiology.name, floor: radiology.floor, isActive: true },
            metadata: {
                service: 'departments',
                method: 'POST',
                path: '/api/departments',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 2),
            entityType: 'services',
            entityId: cardiologyConsult.id,
            action: 'service_catalog.updated',
            performedByUserId: clinicAdmin.userId,
            oldValue: { defaultDurationMinutes: 30, defaultPrice: '120.00' },
            newValue: {
                defaultDurationMinutes: cardiologyConsult.defaultDurationMinutes,
                defaultPrice: cardiologyConsult.defaultPrice.toString(),
            },
            metadata: {
                service: 'service_catalog',
                method: 'PATCH',
                path: `/api/services/${cardiologyConsult.id}`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 3),
            entityType: 'staff-position-types',
            entityId: labTechnicianType.id,
            action: 'staff_position_types.created',
            performedByUserId: ACTOR_USER_ID,
            newValue: {
                name: labTechnicianType.name,
                defaultRoleKey: labTechnicianType.defaultRoleKey,
            },
            metadata: {
                service: 'staff_position_types',
                method: 'POST',
                path: '/api/staff-position-types',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 4),
            entityType: 'staff-departments',
            entityId: cardiologist.id,
            action: 'staff.departments.assigned',
            performedByUserId: clinicAdmin.userId,
            newValue: { staffProfileId: cardiologist.id, departmentId: cardiology.id },
            metadata: {
                service: 'staff',
                method: 'POST',
                path: `/api/staff/${cardiologist.id}/departments`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 5),
            entityType: 'staff-schedules',
            entityId: cardiologist.id,
            action: 'staff.schedules.updated',
            performedByUserId: clinicAdmin.userId,
            oldValue: { monday: { startTime: '09:00', endTime: '17:00' } },
            newValue: { monday: { startTime: '08:30', endTime: '16:30' } },
            metadata: {
                service: 'staff',
                method: 'PUT',
                path: `/api/staff/${cardiologist.id}/schedules`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 6),
            entityType: 'patients',
            entityId: extraPatients[2].id,
            action: 'patients.created',
            performedByUserId: staff.receptionist.userId,
            newValue: {
                firstName: extraPatients[2].firstName,
                lastName: extraPatients[2].lastName,
                email: extraPatients[2].email,
            },
            metadata: {
                service: 'patients',
                method: 'POST',
                path: '/api/patients',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 7),
            entityType: 'patients',
            entityId: extraPatients[0].id,
            action: 'patients.linked_by_personal_number',
            performedByUserId: null,
            oldValue: { userId: null },
            newValue: { userId: extraPatients[0].userId },
            metadata: {
                service: 'patients',
                method: 'POST',
                path: '/internal/patients/link-by-personal-number',
                internal: true,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 8),
            entityType: 'appointments',
            entityId: primaryScheduled.id,
            action: 'appointments.booked',
            performedByUserId: staff.receptionist.userId,
            newValue: {
                patientId: primaryScheduled.patientId,
                scheduledAt: primaryScheduled.scheduledAt.toISOString(),
                status: primaryScheduled.status,
            },
            metadata: {
                service: 'appointments',
                method: 'POST',
                path: '/api/appointments',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 9),
            entityType: 'appointments',
            entityId: billingConsultFuture.id,
            action: 'appointments.public_booked',
            performedByUserId: null,
            newValue: {
                patientId: billingConsultFuture.patientId,
                scheduledAt: billingConsultFuture.scheduledAt.toISOString(),
                status: billingConsultFuture.status,
            },
            metadata: {
                service: 'appointments',
                method: 'POST',
                path: '/api/public/appointments',
                public: true,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 10),
            entityType: 'appointments',
            entityId: cardioCompleted.id,
            action: 'appointments.status_updated',
            performedByUserId: cardiologist.userId,
            oldValue: { status: AppointmentStatus.IN_PROGRESS },
            newValue: { status: AppointmentStatus.COMPLETED },
            metadata: {
                service: 'appointments',
                method: 'PATCH',
                path: `/api/appointments/${cardioCompleted.id}/status`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 11),
            entityType: 'appointments',
            entityId: cardioFuture.id,
            action: 'appointments.rescheduled',
            performedByUserId: staff.receptionist.userId,
            oldValue: {
                scheduledAt: addMinutes(cardioFuture.scheduledAt, -30).toISOString(),
                endAt: addMinutes(cardioFuture.endAt, -30).toISOString(),
            },
            newValue: {
                scheduledAt: cardioFuture.scheduledAt.toISOString(),
                endAt: cardioFuture.endAt.toISOString(),
            },
            metadata: {
                service: 'appointments',
                method: 'PATCH',
                path: `/api/appointments/${cardioFuture.id}`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 12),
            entityType: 'medical-records',
            entityId: fixtureUuid('a3000000', 1),
            action: 'medical_records.finalized',
            performedByUserId: cardiologist.userId,
            oldValue: { isFinalized: false },
            newValue: { isFinalized: true },
            metadata: {
                service: 'medical_records',
                method: 'POST',
                path: `/api/medical-records/${fixtureUuid('a3000000', 1)}/finalize`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 13),
            entityType: 'prescriptions',
            entityId: fixtureUuid('a4000000', 1),
            action: 'prescriptions.created',
            performedByUserId: cardiologist.userId,
            newValue: {
                patientId: extraPatients[0].id,
                itemCount: 1,
                medicationNames: ['Atorvastatin 20mg'],
            },
            metadata: {
                service: 'prescriptions',
                method: 'POST',
                path: '/api/prescriptions',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 14),
            entityType: 'lab-tests',
            entityId: hba1c.id,
            action: 'lab_tests.updated',
            performedByUserId: labTechnician.userId,
            oldValue: { defaultPrice: '48.00' },
            newValue: { defaultPrice: hba1c.defaultPrice?.toString() },
            metadata: {
                service: 'lab_tests',
                method: 'PATCH',
                path: `/api/lab-tests/${hba1c.id}`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 15),
            entityType: 'lab-orders',
            entityId: labOrderCollection.id,
            action: 'lab_orders.created',
            performedByUserId: labTechnician.userId,
            newValue: {
                patientId: labOrderCollection.patientId,
                status: labOrderCollection.status,
                testCount: 3,
            },
            metadata: {
                service: 'lab_orders',
                method: 'POST',
                path: '/api/lab-orders',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 16),
            entityType: 'lab-orders',
            entityId: labOrderEmergency.id,
            action: 'lab_orders.status_updated',
            performedByUserId: labTechnician.userId,
            oldValue: { status: LabOrderStatus.COLLECTED },
            newValue: { status: LabOrderStatus.IN_PROGRESS },
            metadata: {
                service: 'lab_orders',
                method: 'PATCH',
                path: `/api/lab-orders/${labOrderEmergency.id}/status`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 17),
            entityType: 'lab-orders',
            entityId: labOrderCritical.id,
            action: 'lab_orders.results_entered',
            performedByUserId: labTechnician.userId,
            newValue: {
                resultStatus: LabResultStatus.CRITICAL,
                criticalResultCount: 1,
            },
            metadata: {
                service: 'lab_orders',
                method: 'PUT',
                path: `/api/lab-orders/${labOrderCritical.id}/results`,
                requiresReview: true,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 18),
            entityType: 'lab-orders',
            entityId: labOrderCardio.id,
            action: 'lab_orders.reviewed',
            performedByUserId: cardiologist.userId,
            oldValue: { reviewedAt: null },
            newValue: { reviewedAt: utcAt(-4, 13, 0).toISOString() },
            metadata: {
                service: 'lab_orders',
                method: 'POST',
                path: `/api/lab-orders/${labOrderCardio.id}/review`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 19),
            entityType: 'billings',
            entityId: fixtureUuid('a6000000', 2),
            action: 'billings.updated',
            performedByUserId: staff.receptionist.userId,
            oldValue: { status: BillingStatus.PENDING },
            newValue: { status: BillingStatus.OVERDUE },
            metadata: {
                service: 'billings',
                method: 'PUT',
                path: `/api/billings/${fixtureUuid('a6000000', 2)}`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 20),
            entityType: 'billings',
            entityId: fixtureUuid('a6000000', 1),
            action: 'billings.payment_recorded',
            performedByUserId: staff.receptionist.userId,
            oldValue: { amountPaid: '0.00', status: BillingStatus.PENDING },
            newValue: { amountPaid: '25.00', status: BillingStatus.PARTIALLY_PAID },
            metadata: {
                service: 'billings',
                method: 'POST',
                path: `/api/billings/${fixtureUuid('a6000000', 1)}/payments`,
                paymentMethod: PaymentMethod.ONLINE,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 21),
            entityType: 'pharmacy',
            entityId: fixtureUuid('a4200000', 2),
            action: 'pharmacy.queue_started',
            performedByUserId: pharmacist.userId,
            oldValue: { status: PharmacyStatus.PENDING },
            newValue: { status: PharmacyStatus.IN_PROGRESS },
            metadata: {
                service: 'pharmacy',
                method: 'PATCH',
                path: `/api/pharmacy/queue/${fixtureUuid('a4200000', 2)}/start`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 22),
            entityType: 'pharmacy',
            entityId: fixtureUuid('a4200000', 1),
            action: 'pharmacy.queue_dispensed',
            performedByUserId: pharmacist.userId,
            oldValue: { status: PharmacyStatus.IN_PROGRESS, quantityDispensed: 0 },
            newValue: { status: PharmacyStatus.DISPENSED, quantityDispensed: 90 },
            metadata: {
                service: 'pharmacy',
                method: 'POST',
                path: `/api/pharmacy/queue/${fixtureUuid('a4200000', 1)}/dispense`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 23),
            entityType: 'inventory-categories',
            entityId: vaccines.id,
            action: 'inventory_categories.created',
            performedByUserId: clinicAdmin.userId,
            newValue: { name: vaccines.name, isActive: true },
            metadata: {
                service: 'inventory',
                method: 'POST',
                path: '/api/inventory/categories',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 24),
            entityType: 'inventory-items',
            entityId: inventoryMap.get('MED-SALB-100')?.id ?? null,
            action: 'inventory_items.updated',
            performedByUserId: clinicAdmin.userId,
            oldValue: { reorderLevel: '12' },
            newValue: { reorderLevel: '20' },
            metadata: {
                service: 'inventory',
                method: 'PATCH',
                path: `/api/inventory/items/${inventoryMap.get('MED-SALB-100')?.id ?? 'unknown'}`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 25),
            entityType: 'inventory-transactions',
            entityId: fixtureUuid('a8100000', 1),
            action: 'inventory.transactions.recorded',
            performedByUserId: clinicAdmin.userId,
            newValue: {
                inventoryItemId: inventoryMap.get('MED-PARA-500')?.id,
                transactionType: InventoryTransactionType.RECEIVED,
                quantity: '320',
            },
            metadata: {
                service: 'inventory',
                method: 'POST',
                path: `/api/inventory/items/${inventoryMap.get('MED-PARA-500')?.id ?? 'unknown'}/transactions`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 26),
            entityType: 'feedback',
            entityId: fixtureUuid('a7000000', 1),
            action: 'feedback.submitted',
            performedByUserId: extraPatients[0].userId,
            newValue: { rating: 5, status: 'published' },
            metadata: {
                service: 'feedback',
                method: 'POST',
                path: '/api/feedback',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 27),
            entityType: 'feedback',
            entityId: fixtureUuid('a7000000', 3),
            action: 'feedback.status_updated',
            performedByUserId: clinicAdmin.userId,
            oldValue: { status: 'pending' },
            newValue: { status: 'published' },
            metadata: {
                service: 'feedback',
                method: 'PATCH',
                path: `/api/feedback/${fixtureUuid('a7000000', 3)}/status`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 28),
            entityType: 'contact',
            entityId: fixtureUuid('a8000000', 1),
            action: 'contact.submitted',
            performedByUserId: null,
            newValue: { subject: 'Insurance question', status: 'new' },
            metadata: {
                service: 'contact',
                method: 'POST',
                path: '/api/contact',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 29),
            entityType: 'contact',
            entityId: fixtureUuid('a8000000', 3),
            action: 'contact.status_updated',
            performedByUserId: staff.receptionist.userId,
            oldValue: { status: 'in_progress' },
            newValue: { status: 'resolved', replyNotes: 'Shared expected turnaround time.' },
            metadata: {
                service: 'contact',
                method: 'PATCH',
                path: `/api/contact/${fixtureUuid('a8000000', 3)}/status`,
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 30),
            entityType: 'settings',
            entityId: 'facility_name',
            action: 'settings.updated',
            performedByUserId: ACTOR_USER_ID,
            oldValue: { value: 'MedSphere Clinic' },
            newValue: { value: 'MedSphere Demo Clinic' },
            metadata: {
                service: 'settings',
                method: 'PUT',
                path: '/api/settings/facility_name',
                category: 'facility',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 31),
            entityType: 'report-templates',
            entityId: 'daily-operations-template',
            action: 'reports.template_saved',
            performedByUserId: clinicAdmin.userId,
            newValue: {
                name: 'Daily Operations Snapshot',
                reportType: 'appointments',
            },
            metadata: {
                service: 'reports',
                method: 'POST',
                path: '/api/reports/templates',
                seed: 'expanded-demo',
            },
        },
        {
            id: fixtureUuid('a9000000', 32),
            entityType: 'imports',
            entityId: 'demo-patient-import',
            action: 'data_import.started',
            performedByUserId: clinicAdmin.userId,
            newValue: {
                importEntity: 'patients',
                mode: 'lenient',
                importedRows: 3,
                skippedRows: 1,
            },
            metadata: {
                service: 'data_import',
                method: 'POST',
                path: '/api/import/patients?mode=lenient',
                seed: 'expanded-demo',
            },
        },
    ];

    for (const audit of auditFixtures) {
        await prisma.auditLog.upsert({
            where: { id: audit.id },
            update: {
                entityType: audit.entityType,
                entityId: audit.entityId,
                action: audit.action,
                performedByUserId: audit.performedByUserId,
                ipAddress: '127.0.0.1',
                userAgent: 'MedSphere expanded seed',
                oldValue: auditJson(audit.oldValue),
                newValue: auditJson(audit.newValue),
                requestId: 'seed-expanded-demo',
                metadata: auditJson(audit.metadata),
            },
            create: {
                id: audit.id,
                entityType: audit.entityType,
                entityId: audit.entityId,
                action: audit.action,
                performedByUserId: audit.performedByUserId,
                ipAddress: '127.0.0.1',
                userAgent: 'MedSphere expanded seed',
                oldValue: auditJson(audit.oldValue),
                newValue: auditJson(audit.newValue),
                requestId: 'seed-expanded-demo',
                metadata: auditJson(audit.metadata),
            },
        });
    }

    await prisma.setting.upsert({
        where: { key: 'demo.seed_summary' },
        update: {
            value: {
                authPassword: DEMO_PASSWORD,
                authUsers: Object.values(DEMO_USER_IDS).length,
                linkedCorePatients: allPatients.length,
                departments: 8,
                note: 'Auth passwords are owned by lab2-auth-service; this core service stores linked user IDs.',
            },
            description: 'Local demo seed summary',
            isPublic: false,
            updatedBy: ACTOR_USER_ID,
        },
        create: {
            key: 'demo.seed_summary',
            value: {
                authPassword: DEMO_PASSWORD,
                authUsers: Object.values(DEMO_USER_IDS).length,
                linkedCorePatients: allPatients.length,
                departments: 8,
                note: 'Auth passwords are owned by lab2-auth-service; this core service stores linked user IDs.',
            },
            description: 'Local demo seed summary',
            isPublic: false,
            createdBy: ACTOR_USER_ID,
            updatedBy: ACTOR_USER_ID,
        },
    });

    void appointments;
    void clinicalData;
}

async function cleanupLegacyInvalidUuidFixtures() {
    const legacy = LEGACY_INVALID_UUIDS;

    await prisma.pharmacyDispensingItem.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.pharmacyDispensingItems] } },
                { pharmacyQueueId: { in: [...legacy.pharmacyQueue] } },
                { prescriptionItemId: { in: [...legacy.prescriptionItems] } },
            ],
        },
    });
    await prisma.pharmacyQueue.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.pharmacyQueue] } },
                { prescriptionId: { in: [...legacy.prescriptions] } },
                { patientId: { in: [...legacy.patients] } },
            ],
        },
    });
    await prisma.prescriptionItem.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.prescriptionItems] } },
                { prescriptionId: { in: [...legacy.prescriptions] } },
            ],
        },
    });
    await prisma.prescription.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.prescriptions] } },
                { patientId: { in: [...legacy.patients] } },
                { appointmentId: { in: [...legacy.appointments] } },
                { staffProfileId: { in: [...legacy.staff] } },
            ],
        },
    });
    await prisma.labOrderItem.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.labOrderItems] } },
                { labOrderId: { in: [...legacy.labOrders] } },
            ],
        },
    });
    await prisma.labOrder.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.labOrders] } },
                { patientId: { in: [...legacy.patients] } },
                { appointmentId: { in: [...legacy.appointments] } },
                { medicalRecordId: { in: [...legacy.medicalRecords] } },
                { orderedByStaffId: { in: [...legacy.staff] } },
            ],
        },
    });
    await prisma.payment.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.payments] } },
                { billingId: { in: [...legacy.billings] } },
            ],
        },
    });
    await prisma.billingItem.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.billingItems] } },
                { billingId: { in: [...legacy.billings] } },
            ],
        },
    });
    await prisma.billing.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.billings] } },
                { patientId: { in: [...legacy.patients] } },
                { appointmentId: { in: [...legacy.appointments] } },
            ],
        },
    });
    await prisma.feedback.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.feedback] } },
                { patientId: { in: [...legacy.patients] } },
                { appointmentId: { in: [...legacy.appointments] } },
            ],
        },
    });
    await prisma.medicalRecordAmendment.deleteMany({
        where: {
            medicalRecordId: { in: [...legacy.medicalRecords] },
        },
    });
    await prisma.medicalRecord.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.medicalRecords] } },
                { patientId: { in: [...legacy.patients] } },
                { appointmentId: { in: [...legacy.appointments] } },
                { staffProfileId: { in: [...legacy.staff] } },
            ],
        },
    });
    await prisma.appointment.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.appointments] } },
                { patientId: { in: [...legacy.patients] } },
                { staffProfileId: { in: [...legacy.staff] } },
            ],
        },
    });
    await prisma.scheduleException.deleteMany({
        where: {
            staffProfileId: { in: [...legacy.staff] },
        },
    });
    await prisma.staffSchedule.deleteMany({
        where: {
            staffProfileId: { in: [...legacy.staff] },
        },
    });
    await prisma.staffDepartmentAssignment.deleteMany({
        where: {
            staffProfileId: { in: [...legacy.staff] },
        },
    });
    await prisma.staffProfile.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.staff] } },
                { userId: { in: [...legacy.staff] } },
            ],
        },
    });
    await prisma.patient.deleteMany({
        where: {
            OR: [
                { id: { in: [...legacy.patients] } },
                { userId: { in: [...legacy.users] } },
            ],
        },
    });
    await prisma.inventoryTransaction.deleteMany({
        where: {
            id: { in: [...legacy.inventoryTransactions] },
        },
    });
    await prisma.contactMessage.deleteMany({
        where: {
            id: { in: [...legacy.contactMessages] },
        },
    });
    await prisma.auditLog.deleteMany({
        where: {
            id: { in: [...legacy.auditLogs] },
        },
    });
}

async function seedMissingPatientPersonalNumbers() {
    const patientsMissingPersonalNumber = await prisma.patient.findMany({
        where: {
            OR: [{ personalNumber: null }, { personalNumberHash: null }],
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
    });

    let sequence = 1;
    let updatedCount = 0;

    for (const patient of patientsMissingPersonalNumber) {
        let personalNumber = '';
        let personalNumberHash: string | null = null;
        let duplicate: { id: string } | null = null;

        do {
            personalNumber = `MSP-PAT-BACKFILL-${String(sequence).padStart(4, '0')}`;
            personalNumberHash = hashPersonalNumber(personalNumber);
            sequence += 1;
            duplicate = await prisma.patient.findFirst({
                where: {
                    personalNumberHash,
                    NOT: { id: patient.id },
                },
                select: { id: true },
            });
        } while (duplicate);

        await prisma.patient.update({
            where: { id: patient.id },
            data: {
                ...personalNumberData(personalNumber),
                updatedBy: ACTOR_USER_ID,
            },
        });
        updatedCount += 1;
    }

    if (updatedCount > 0) {
        console.log(`Backfilled personal numbers for ${updatedCount} existing patient profiles.`);
    }
}

async function main() {
    await cleanupLegacyInvalidUuidFixtures();
    await seedPermissions();
    await seedSettings();
    await seedStaffPositionTypes();
    await seedLabTests();
    await seedInventoryCategories();

    const departmentsAndServices = await seedDepartmentsAndServices();
    const staff = await seedStaff(departmentsAndServices.departments);
    const patients = await seedPatients();
    const inventory = await seedInventory(departmentsAndServices.departments);
    const appointments = await seedAppointments(patients, staff, departmentsAndServices);
    const clinicalData = await seedClinicalData(
        patients,
        staff,
        departmentsAndServices,
        appointments,
    );

    await seedPrescriptionsAndPharmacy(
        patients,
        staff,
        appointments,
        clinicalData,
        inventory,
    );
    await seedLabOrders(patients, staff, departmentsAndServices, appointments, clinicalData);
    await seedBilling(patients, appointments, departmentsAndServices, inventory);
    await seedFeedbackAndOperations(patients, appointments);
    await seedExpandedDemoData(
        departmentsAndServices,
        staff,
        patients,
        inventory,
        appointments,
        clinicalData,
    );
    await seedMissingPatientPersonalNumbers();
    await assertSeedAppointmentIntegrity();

    console.log('Core service seed complete.');
    console.log(`Shared auth demo password: ${DEMO_PASSWORD}`);
    console.log(`Linked patient profile id: ${DEMO_USER_IDS.patient}`);
    console.log(`Linked patient profile id: ${DEMO_USER_IDS.patientSamir}`);
    console.log(`Linked patient profile id: ${DEMO_USER_IDS.patientLina}`);
    console.log(`Linked doctor staff profile id: ${DEMO_USER_IDS.doctor}`);
    console.log(`Linked doctor staff profile id: ${DEMO_USER_IDS.cardiologist}`);
    console.log(`Linked doctor staff profile id: ${DEMO_USER_IDS.pediatrician}`);
    console.log(`Linked nurse staff profile id: ${DEMO_USER_IDS.nurse}`);
    console.log(`Linked nurse staff profile id: ${DEMO_USER_IDS.emergencyNurse}`);
    console.log(`Linked receptionist staff profile id: ${DEMO_USER_IDS.receptionist}`);
    console.log(`Linked lab staff profile id: ${DEMO_USER_IDS.labTechnician}`);
    console.log(`Linked pharmacist staff profile id: ${DEMO_USER_IDS.pharmacist}`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
