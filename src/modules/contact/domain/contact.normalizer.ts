export function normalizeOptionalText(value?: string | null) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const trimmed = value.trim().replace(/\s+/g, ' ');

    return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOptionalMultilineText(value?: string | null) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const normalized = value
        .trim()
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n');

    return normalized.length > 0 ? normalized : null;
}

export function normalizeRequiredText(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}
