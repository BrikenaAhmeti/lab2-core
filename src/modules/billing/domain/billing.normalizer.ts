import { AppError } from '../../../shared/core/errors/app-error';

export function normalizeOptionalText(value?: string | null) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const normalized = value.trim().replace(/\s+/g, ' ');

    return normalized.length > 0 ? normalized : null;
}

export function normalizeRequiredText(value: string, fieldName: string) {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (!normalized) {
        throw new AppError(`${fieldName} is required`, 400);
    }

    return normalized;
}

export function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLineTotal(quantity: number, unitPrice: number) {
    return roundMoney(quantity * unitPrice);
}
