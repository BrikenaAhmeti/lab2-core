export function normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) return value ?? null;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function normalizeEmail(value?: string | null) {
    const normalized = normalizeOptionalText(value);
    return normalized ? normalized.toLowerCase() : normalized;
}

export function normalizeSearch(value?: string) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function normalizePersonalNumber(value?: string | null) {
    const normalized = normalizeOptionalText(value);
    return normalized ? normalized.replace(/\s+/g, '') : normalized;
}
