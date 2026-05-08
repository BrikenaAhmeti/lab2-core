function collapseWhitespace(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function normalizeDepartmentName(name: string) {
    return collapseWhitespace(name);
}

export function normalizeDepartmentDescription(description?: string | null) {
    if (description === undefined) {
        return undefined;
    }

    if (description === null) {
        return null;
    }

    const normalized = collapseWhitespace(description);
    return normalized.length > 0 ? normalized : null;
}

export function normalizeDepartmentOptionalText(value?: string | null) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const normalized = collapseWhitespace(value);
    return normalized.length > 0 ? normalized : null;
}

export function normalizeDepartmentSearch(search?: string) {
    if (!search) {
        return undefined;
    }

    const normalized = collapseWhitespace(search);
    return normalized.length > 0 ? normalized : undefined;
}
