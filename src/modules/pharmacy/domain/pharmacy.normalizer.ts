export function normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
        return null;
    }

    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.length ? normalized : null;
}
