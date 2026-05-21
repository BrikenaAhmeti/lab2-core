export function normalizeOptionalText(value?: string | null) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
}

export function normalizeRequiredText(value: string, fieldName: string) {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
        throw new Error(`${fieldName} is required`);
    }

    return trimmed;
}
