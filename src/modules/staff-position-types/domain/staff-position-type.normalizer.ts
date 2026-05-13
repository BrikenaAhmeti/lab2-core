function collapseWhitespace(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function normalizeStaffPositionTypeName(name: string) {
    return collapseWhitespace(name);
}

export function normalizeStaffPositionTypeDescription(description?: string | null) {
    if (description === undefined) {
        return undefined;
    }

    if (description === null) {
        return null;
    }

    const normalized = collapseWhitespace(description);
    return normalized.length > 0 ? normalized : null;
}

export function normalizeDefaultRoleKey(defaultRoleKey: string) {
    return collapseWhitespace(defaultRoleKey)
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
}

export function normalizeApplicableDepartmentIds(
    applicableDepartmentIds?: string[] | null,
) {
    if (applicableDepartmentIds === undefined) {
        return undefined;
    }

    if (applicableDepartmentIds === null) {
        return null;
    }

    return [...new Set(applicableDepartmentIds)];
}
