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
    {
        name: 'staff-types:read',
        scope: 'all',
        description: 'Read staff position types across all scopes',
    },
    {
        name: 'staff-types:manage',
        scope: 'all',
        description: 'Create, update, and deactivate staff position types across all scopes',
    },
    {
        name: 'staff:read',
        scope: 'all',
        description: 'Read staff profiles and department assignments across all scopes',
    },
    {
        name: 'staff:manage',
        scope: 'all',
        description: 'Create, update, and deactivate staff profiles across all scopes',
    },
    {
        name: 'appointments:read',
        scope: 'all',
        description: 'Read appointments across all scopes',
    },
    {
        name: 'appointments:create',
        scope: 'all',
        description: 'Book appointments across all scopes',
    },
    {
        name: 'appointments:update',
        scope: 'all',
        description: 'Reschedule appointments and update appointment status across all scopes',
    },
    {
        name: 'appointments:cancel',
        scope: 'all',
        description: 'Cancel appointments across all scopes',
    },
    {
        name: 'medical_records:read',
        scope: 'all',
        description: 'Read medical records across all scopes',
    },
    {
        name: 'medical_records:write',
        scope: 'all',
        description: 'Create, finalize, and amend medical records across all scopes',
    },
    {
        name: 'prescriptions:read',
        scope: 'all',
        description: 'Read prescriptions across all scopes',
    },
    {
        name: 'prescriptions:write',
        scope: 'all',
        description: 'Create and void prescriptions across all scopes',
    },
    {
        name: 'lab_tests:read',
        scope: 'all',
        description: 'Read laboratory test catalog entries across all scopes',
    },
    {
        name: 'lab_tests:manage',
        scope: 'all',
        description: 'Create, update, and deactivate lab tests across all scopes',
    },
    {
        name: 'lab_orders:read',
        scope: 'all',
        description: 'Read lab orders across all scopes',
    },
    {
        name: 'lab_orders:create',
        scope: 'all',
        description: 'Create lab orders across all scopes',
    },
    {
        name: 'lab_orders:update',
        scope: 'all',
        description: 'Update lab order workflow status across all scopes',
    },
    {
        name: 'lab_results:enter',
        scope: 'all',
        description: 'Enter lab test results across all scopes',
    },
    {
        name: 'lab_results:review',
        scope: 'all',
        description: 'Review and release lab results across all scopes',
    },
    {
        name: 'inventory:read',
        scope: 'all',
        description: 'Read inventory items and stock status across all scopes',
    },
    {
        name: 'inventory:manage',
        scope: 'all',
        description: 'Create, update, and adjust inventory across all scopes',
    },
    {
        name: 'pharmacy:read',
        scope: 'all',
        description: 'Read pharmacy queue and dispensing details across all scopes',
    },
    {
        name: 'pharmacy:dispense',
        scope: 'all',
        description: 'Start, dispense, and fulfill pharmacy queue items across all scopes',
    },
    {
        name: 'billing:read',
        scope: 'all',
        description: 'Read billing records and billing stats across all scopes',
    },
    {
        name: 'billing:manage',
        scope: 'all',
        description: 'Edit billings and record payments across all scopes',
    },
    {
        name: 'dashboard:read',
        scope: 'all',
        description: 'Read dashboard aggregate statistics across all scopes',
    },
    {
        name: 'feedback:read',
        scope: 'all',
        description: 'Read feedback submissions across all scopes',
    },
    {
        name: 'feedback:manage',
        scope: 'all',
        description: 'Moderate feedback submissions across all scopes',
    },
    {
        name: 'contact:read',
        scope: 'all',
        description: 'Read contact form submissions across all scopes',
    },
    {
        name: 'contact:manage',
        scope: 'all',
        description: 'Manage contact form submission statuses across all scopes',
    },
    {
        name: 'audit_logs:read',
        scope: 'all',
        description: 'Read audit log history across all scopes',
    },
    {
        name: 'reports:generate',
        scope: 'all',
        description: 'Generate operational reports across all scopes',
    },
    {
        name: 'settings:read',
        scope: 'all',
        description: 'Read platform settings across all scopes',
    },
    {
        name: 'settings:manage',
        scope: 'all',
        description: 'Update platform settings across all scopes',
    },
] as const;

const SETTINGS = [
    {
        key: 'facility_name',
        value: 'MedSphere Demo Clinic',
        description: 'Facility display name',
        isPublic: false,
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
        isPublic: false,
    },
    {
        key: 'password_min_length',
        value: 12,
        description: 'Minimum password length',
        isPublic: false,
    },
    {
        key: 'appointment_reminder_24h',
        value: true,
        description: 'Enable 24-hour appointment reminders',
        isPublic: false,
    },
    {
        key: 'appointment_reminder_1h',
        value: true,
        description: 'Enable 1-hour appointment reminders',
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
