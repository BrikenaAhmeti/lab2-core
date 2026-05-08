function collapseWhitespace(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function normalizeServiceCatalogName(name: string) {
    return collapseWhitespace(name);
}

export function normalizeServiceCatalogDescription(description?: string | null) {
    if (description === undefined) {
        return undefined;
    }

    if (description === null) {
        return null;
    }

    const normalized = collapseWhitespace(description);
    return normalized.length > 0 ? normalized : null;
}

export function normalizeServiceCatalogSearch(search?: string) {
    if (!search) {
        return undefined;
    }

    const normalized = collapseWhitespace(search);
    return normalized.length > 0 ? normalized : undefined;
}
