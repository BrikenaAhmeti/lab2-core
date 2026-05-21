import { PrescriptionView } from '../domain/prescription.entity';

function escapePdfText(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapLine(line: string, width = 92) {
    const words = line.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        if (!current) {
            current = word;
            continue;
        }

        if (`${current} ${word}`.length > width) {
            lines.push(current);
            current = word;
            continue;
        }

        current = `${current} ${word}`;
    }

    if (current) {
        lines.push(current);
    }

    return lines.length > 0 ? lines : [''];
}

function formatDate(date: Date | null) {
    return date ? date.toISOString().slice(0, 10) : 'N/A';
}

function createPdf(lines: string[]) {
    const textCommands = [
        'BT',
        '/F1 16 Tf',
        '50 760 Td',
        `(${escapePdfText(lines[0])}) Tj`,
        '/F1 10 Tf',
        '0 -24 Td',
        ...lines.slice(1).map((line) => `(${escapePdfText(line)}) Tj 0 -14 Td`),
        'ET',
    ].join('\n');

    const objects = [
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
        '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
        '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
        `5 0 obj\n<< /Length ${Buffer.byteLength(textCommands)} >>\nstream\n${textCommands}\nendstream\nendobj\n`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    for (const object of objects) {
        offsets.push(Buffer.byteLength(pdf));
        pdf += object;
    }

    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    pdf += offsets
        .slice(1)
        .map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`)
        .join('');
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(pdf, 'utf8');
}

export class PrescriptionPdfService {
    build(prescription: PrescriptionView): Buffer {
        const lines = [
            'Prescription',
            `Prescription ID: ${prescription.id}`,
            `Issued: ${formatDate(prescription.issuedAt)}    Expires: ${formatDate(prescription.expiresAt)}`,
            `Status: ${prescription.status}    Pharmacy: ${prescription.pharmacyStatus ?? 'N/A'}`,
            `Patient: ${prescription.patient.name}`,
            `Prescriber: ${prescription.staff.displayName}`,
            prescription.medicalRecord?.diagnosis
                ? `Diagnosis: ${prescription.medicalRecord.diagnosis}`
                : 'Diagnosis: N/A',
            '',
            'Medications',
            ...prescription.items.flatMap((item, index) =>
                wrapLine(
                    `${index + 1}. ${item.medicationName} - ${item.dosage}; ${item.frequency}; qty ${item.quantityPrescribed}` +
                    (item.durationInstructions ? `; ${item.durationInstructions}` : '') +
                    (item.notes ? `; ${item.notes}` : ''),
                ),
            ),
            '',
            `Notes: ${prescription.notes ?? 'N/A'}`,
        ];

        return createPdf(lines);
    }
}
