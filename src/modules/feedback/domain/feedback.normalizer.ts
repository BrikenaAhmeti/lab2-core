import { AppError } from '../../../shared/core/errors/app-error';

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

export function normalizeRating(value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
        throw new AppError('Rating must be between 1 and 5', 400);
    }

    return value;
}
