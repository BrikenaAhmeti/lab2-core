export interface StaffUserFallbackInput {
    userId: string;
    employeeCode?: string | null;
    user?: {
        id?: string;
        userId?: string;
        firstName?: string | null;
        lastName?: string | null;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
    };
}

const seededStaffEmailsByUserId: Record<string, string> = {
    '11111111-1111-4111-8111-111111111112': 'clinic.admin@medsphere.local',
    '22222222-2222-4222-8222-222222222222': 'doctor@medsphere.local',
    '22222222-2222-4222-8222-222222222223': 'cardiology@medsphere.local',
    '22222222-2222-4222-8222-222222222224': 'pediatrics@medsphere.local',
    '33333333-3333-4333-8333-333333333333': 'nurse@medsphere.local',
    '33333333-3333-4333-8333-333333333334': 'emergency.nurse@medsphere.local',
    '44444444-4444-4444-8444-444444444444': 'reception@medsphere.local',
    '88888888-8888-4888-8888-888888888888': 'lab@medsphere.local',
    '99999999-9999-4999-8999-999999999999': 'pharmacy@medsphere.local',
};

function displayNameFromEmployeeCode(employeeCode?: string | null) {
    const value = employeeCode?.trim();

    if (!value || /^[A-Z]{2,5}-\d+$/i.test(value)) {
        return null;
    }

    return value.replace(/^(Dr\.?|Nurse)\s+/i, '').trim() || null;
}

function emailFromName(name?: string | null) {
    const cleanedName = name
        ?.normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’]/g, '')
        .trim();

    if (!cleanedName || !cleanedName.includes(' ')) {
        return null;
    }

    const localPart = cleanedName
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '');

    return localPart ? `${localPart}@medsphere.local` : null;
}

export function deriveStaffUserFallback(input: StaffUserFallbackInput) {
    const userName =
        input.user?.name ??
        [input.user?.firstName, input.user?.lastName].filter(Boolean).join(' ');
    const name = userName || displayNameFromEmployeeCode(input.employeeCode);
    const [firstName, ...lastNameParts] = (name ?? '').split(/\s+/).filter(Boolean);
    const email =
        input.user?.email ??
        seededStaffEmailsByUserId[input.user?.userId ?? input.user?.id ?? input.userId] ??
        emailFromName(name);

    return {
        id: input.user?.id ?? input.userId,
        userId: input.user?.userId ?? input.user?.id ?? input.userId,
        firstName: input.user?.firstName ?? firstName ?? null,
        lastName: input.user?.lastName ?? (lastNameParts.join(' ') || null),
        name,
        email,
        phone: input.user?.phone ?? null,
    };
}
