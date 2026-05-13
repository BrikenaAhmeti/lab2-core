import { prisma } from '../src/infrastructure/db/prisma';

const SUPER_ADMIN_USER_ID =
    process.env.AUTH_SUPER_ADMIN_USER_ID ?? '00000000-0000-0000-0000-000000000001';

const PERMISSIONS = [
    {
        name: 'departments:read',
        scope: 'all',
        description: 'Read departments across all scopes',
    },
    {
        name: 'departments:manage',
        scope: 'all',
        description: 'Create, update, and deactivate departments across all scopes',
    },
    {
        name: 'services:read',
        scope: 'all',
        description: 'Read services across all scopes',
    },
    {
        name: 'services:manage',
        scope: 'all',
        description: 'Create, update, and deactivate services across all scopes',
    },
] as const;

const SETTINGS = [
    {
        key: 'facility.profile',
        value: {
            name: 'MedSphere Demo Clinic',
            timezone: 'Europe/Belgrade',
            currency: 'EUR',
        },
        description: 'Core facility profile defaults',
        isPublic: false,
    },
    {
        key: 'appointments.defaults',
        value: {
            slotIntervalMinutes: 30,
            leadTimeHours: 24,
            allowPublicBooking: true,
        },
        description: 'Default appointment configuration',
        isPublic: false,
    },
    {
        key: 'auth.super_admin_reference',
        value: {
            userId: SUPER_ADMIN_USER_ID,
        },
        description: 'Reference UUID for the Auth Service super admin account',
        isPublic: false,
    },
] as const;

const STAFF_POSITION_TYPES = [
    {
        name: 'Doctor',
        description: 'Default medical practitioner profile',
        defaultRoleKey: 'doctor',
        applicableDepartmentIds: null,
    },
    {
        name: 'Nurse',
        description: 'Default nursing profile',
        defaultRoleKey: 'nurse',
        applicableDepartmentIds: null,
    },
    {
        name: 'Receptionist',
        description: 'Default front-desk and scheduling profile',
        defaultRoleKey: 'receptionist',
        applicableDepartmentIds: null,
    },
] as const;

const LAB_TESTS = [
    {
        code: 'CBC',
        name: 'Complete Blood Count',
        category: 'Hematology',
        sampleType: 'Blood',
        referenceRange: 'Adult reference ranges vary by metric',
    },
    {
        code: 'BMP',
        name: 'Basic Metabolic Panel',
        category: 'Chemistry',
        sampleType: 'Blood',
        referenceRange: 'Adult reference ranges vary by metric',
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
] as const;

async function seedPermissions() {
    for (const permission of PERMISSIONS) {
        await prisma.servicePermission.upsert({
            where: {
                name_scope: {
                    name: permission.name,
                    scope: permission.scope,
                },
            },
            update: {
                description: permission.description,
            },
            create: permission,
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
            },
            create: setting,
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
                applicableDepartmentIds: positionType.applicableDepartmentIds,
                isActive: true,
            },
            create: {
                ...positionType,
                isActive: true,
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
                category: test.category,
                sampleType: test.sampleType,
                referenceRange: test.referenceRange,
                isActive: true,
            },
            create: {
                ...test,
                isActive: true,
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
            },
            create: {
                ...category,
                isActive: true,
            },
        });
    }
}

async function main() {
    await seedPermissions();
    await seedSettings();
    await seedStaffPositionTypes();
    await seedLabTests();
    await seedInventoryCategories();

    console.log('Core service seed complete.');
    console.log(`Auth Service super admin reference: ${SUPER_ADMIN_USER_ID}`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
