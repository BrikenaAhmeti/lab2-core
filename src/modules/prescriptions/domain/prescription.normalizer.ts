import { AppError } from '../../../shared/core/errors/app-error';

function normalizeWhitespace(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function normalizeOptionalText(value: string | null | undefined) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const normalized = normalizeWhitespace(value);

    return normalized.length > 0 ? normalized : null;
}

export function normalizeRequiredText(value: string, fieldName: string) {
    const normalized = normalizeWhitespace(value);

    if (!normalized) {
        throw new AppError(`${fieldName} is required`, 400);
    }

    return normalized;
}
