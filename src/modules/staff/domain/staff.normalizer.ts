export function collapseWhitespace(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function normalizeOptionalText(value?: string | null) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const normalized = collapseWhitespace(value);
    return normalized.length > 0 ? normalized : null;
}

export function normalizeEmployeeCode(value: string) {
    return collapseWhitespace(value).toUpperCase();
}

export function normalizeSearch(value?: string) {
    if (!value) {
        return undefined;
    }

    const normalized = collapseWhitespace(value);
    return normalized.length > 0 ? normalized : undefined;
}
