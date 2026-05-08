import { prisma } from '../src/infrastructure/db/prisma';

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

async function main() {
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

    console.log('Seed complete.');
    console.log('Department permissions are ready for auth-service alignment.');
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
