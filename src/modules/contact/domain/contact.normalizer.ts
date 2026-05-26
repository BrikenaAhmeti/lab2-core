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

export function normalizeRequiredText(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}
