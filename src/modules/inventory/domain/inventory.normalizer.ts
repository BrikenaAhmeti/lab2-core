function collapseWhitespace(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function normalizeRequiredText(value: string) {
    return collapseWhitespace(value);
}

export function normalizeOptionalText(value?: string | null) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const normalized = collapseWhitespace(value);

    return normalized || null;
}

export function normalizeSku(value: string) {
    return normalizeRequiredText(value).toUpperCase();
}

export function normalizeSearch(value?: string) {
    if (!value) {
        return undefined;
    }

    const normalized = collapseWhitespace(value);

    return normalized || undefined;
}
