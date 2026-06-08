export const INCOMPLETE_PERSONAL_NUMBER_MESSAGE =
    'The personal number seems incomplete. Please provide it again.';

const MIN_PERSONAL_NUMBER_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeSpokenEmail(value?: string | null) {
    if (value === undefined || value === null) {
        return undefined;
    }

    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/\s+at\s+/g, '@')
        .replace(/\s+dot\s+/g, '.')
        .replace(/\s*@\s*/g, '@')
        .replace(/\s*\.\s*/g, '.')
        .replace(/\s+/g, '');

    if (!normalized) {
        return undefined;
    }

    return EMAIL_PATTERN.test(normalized) ? normalized : null;
}

export function normalizePhoneForVapi(value?: string | null) {
    if (value === undefined || value === null) {
        return undefined;
    }

    const normalized = normalizeDigitsFromSpeech(value);

    return normalized || undefined;
}

export function normalizePersonalNumberForVapi(value?: string | null) {
    const normalized = normalizeDigitsFromSpeech(value);

    if (!normalized || normalized.length < MIN_PERSONAL_NUMBER_LENGTH) {
        return null;
    }

    return normalized;
}

export function normalizeDigitsFromSpeech(value?: string | null) {
    if (value === undefined || value === null) {
        return '';
    }

    return value
        .toLowerCase()
        .replace(/\bplus\b/g, '')
        .replace(/[,\s.]+/g, '')
        .replace(/\D+/g, '');
}
