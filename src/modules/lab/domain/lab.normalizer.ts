import { AppError } from '../../../shared/core/errors/app-error';
import { LabOrderPriority } from './lab.entity';

function collapseWhitespace(value: string) {
    return value.trim().replace(/\s+/g, ' ');
}

export function normalizeRequiredText(value: string, field: string) {
    const normalized = collapseWhitespace(value);

    if (!normalized) {
        throw new AppError(`${field} is required`, 400);
    }

    return normalized;
}

export function normalizeOptionalText(value?: string | null) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const normalized = collapseWhitespace(value);
    return normalized.length > 0 ? normalized : null;
}

export function normalizeLabCode(value: string) {
    return normalizeRequiredText(value, 'Code').toUpperCase();
}

export function normalizePriority(
    value?: string | null,
): LabOrderPriority | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    const normalized = collapseWhitespace(value).toLowerCase();

    if (normalized === 'normal' || normalized === 'urgent') {
        return normalized;
    }

    throw new AppError('Priority must be normal or urgent', 400);
}
