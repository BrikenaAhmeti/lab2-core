import crypto from 'crypto';

const FALLBACK_SECRET = 'medsphere-local-patient-data-key';

function getKey() {
    const configuredKey =
        process.env.PATIENT_DATA_ENCRYPTION_KEY ||
        process.env.JWT_ACCESS_SECRET ||
        FALLBACK_SECRET;

    return crypto.createHash('sha256').update(configuredKey).digest();
}

export function hashPersonalNumber(personalNumber: string | null | undefined) {
    if (!personalNumber) return null;

    return crypto.createHmac('sha256', getKey()).update(personalNumber).digest('hex');
}

export function encryptPersonalNumber(personalNumber: string | null | undefined) {
    if (!personalNumber) return null;
    if (personalNumber.startsWith('enc:')) return personalNumber;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(personalNumber, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
        'enc',
        iv.toString('base64url'),
        tag.toString('base64url'),
        encrypted.toString('base64url'),
    ].join(':');
}

export function decryptPersonalNumber(personalNumber: string | null | undefined) {
    if (!personalNumber) return null;
    if (!personalNumber.startsWith('enc:')) return personalNumber;

    const [, ivValue, tagValue, encryptedValue] = personalNumber.split(':');

    if (!ivValue || !tagValue || !encryptedValue) {
        return null;
    }

    try {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            getKey(),
            Buffer.from(ivValue, 'base64url'),
        );
        decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

        return Buffer.concat([
            decipher.update(Buffer.from(encryptedValue, 'base64url')),
            decipher.final(),
        ]).toString('utf8');
    } catch {
        return null;
    }
}
