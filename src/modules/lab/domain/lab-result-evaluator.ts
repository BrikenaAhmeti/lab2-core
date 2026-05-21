import { LabResultStatus } from '../../../generated/prisma';
import { LabResultFlag } from './lab.entity';

const CRITICAL_MULTIPLIER = 3;

function extractNumbers(value: string) {
    return [...value.matchAll(/-?\d+(?:\.\d+)?/g)]
        .map((match) => Number(match[0]))
        .filter((item) => Number.isFinite(item));
}

function parseResultValue(value: string) {
    const first = extractNumbers(value)[0];
    return typeof first === 'number' ? first : null;
}

export function parseReferenceRange(referenceRange?: string | null) {
    if (!referenceRange) {
        return null;
    }

    const values = extractNumbers(referenceRange);

    if (values.length < 2) {
        return null;
    }

    const [first, second] = values;

    return {
        min: Math.min(first, second),
        max: Math.max(first, second),
    };
}

function isCriticalValue(value: number, min: number, max: number) {
    if (min > 0 && max > 0) {
        return value < min / CRITICAL_MULTIPLIER || value > max * CRITICAL_MULTIPLIER;
    }

    const width = Math.max(max - min, 1);
    return (
        value < min - width * (CRITICAL_MULTIPLIER - 1) ||
        value > max + width * (CRITICAL_MULTIPLIER - 1)
    );
}

export function evaluateLabResult(input: {
    resultValue: string;
    referenceRange?: string | null;
}) {
    const numericValue = parseResultValue(input.resultValue);
    const range = parseReferenceRange(input.referenceRange);

    if (numericValue === null || !range) {
        return {
            flag: 'unavailable' as LabResultFlag,
            resultStatus: LabResultStatus.ENTERED,
            isCritical: false,
        };
    }

    if (numericValue < range.min || numericValue > range.max) {
        const critical = isCriticalValue(numericValue, range.min, range.max);

        return {
            flag: critical ? ('critical' as LabResultFlag) : ('abnormal' as LabResultFlag),
            resultStatus: critical
                ? LabResultStatus.CRITICAL
                : LabResultStatus.ABNORMAL,
            isCritical: critical,
        };
    }

    return {
        flag: 'normal' as LabResultFlag,
        resultStatus: LabResultStatus.ENTERED,
        isCritical: false,
    };
}

export function deriveLabResultFlag(input: {
    resultValue: string | null;
    resultStatus: LabResultStatus;
    isCritical: boolean;
    referenceRange?: string | null;
}): LabResultFlag {
    if (!input.resultValue) {
        return 'pending';
    }

    if (input.isCritical || input.resultStatus === LabResultStatus.CRITICAL) {
        return 'critical';
    }

    if (input.resultStatus === LabResultStatus.ABNORMAL) {
        return 'abnormal';
    }

    return parseReferenceRange(input.referenceRange) ? 'normal' : 'unavailable';
}
