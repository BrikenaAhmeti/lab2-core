import PDFDocument from 'pdfkit';
import { BillingView } from '../domain/billing.entity';

const brand = {
    primary: '#1685b5',
    primaryDark: '#0f5f85',
    accent: '#f59e0b',
    ink: '#142033',
    muted: '#64748b',
    border: '#d8e5ec',
    surface: '#f5fafc',
    surfaceStrong: '#eaf5f9',
    success: '#1f9d63',
    danger: '#b91c1c',
    white: '#ffffff',
};

const clinicDetails = {
    name: 'MedSphere',
    legalName: 'MedSphere Healthcare Management Platform',
    address: 'Rr. B, Prishtina 10000, Kosovo',
    email: 'billing@medsphere.local',
    phone: '+383 44 000 100',
    website: 'www.medsphere.local',
    businessNumber: '810123456',
    tvshNumber: 'TVSH-KS-601234789',
    bankName: 'MedSphere Treasury',
    iban: 'XK05 1212 0123 4567 8901',
    paymentTerms: 'Payment due by the invoice due date. Include the invoice number as the payment reference.',
};

function formatDate(date?: Date | null) {
    return date ? date.toISOString().slice(0, 10) : 'N/A';
}

function formatMoney(value: number) {
    return `€${value.toFixed(2)}`;
}

function formatLabel(value: string) {
    return value
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function filenamePart(value?: string | null, fallback = 'billing') {
    const normalized = value
        ?.normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || fallback;
}

export function buildBillingPdfFileName(billing: BillingView) {
    const patient = filenamePart(billing.patient.name, 'patient');
    const invoiceDate = formatDate(billing.issuedAt ?? billing.dueDate ?? billing.createdAt);
    const date = invoiceDate === 'N/A' ? 'undated' : invoiceDate;
    const billingNumber = filenamePart(billing.billingNumber, 'billing');

    return `${patient}-${date}-${billingNumber}.pdf`;
}

function collectPdf(doc: PDFKit.PDFDocument) {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });
}

function addLogo(doc: PDFKit.PDFDocument, x: number, y: number) {
    doc.save();
    doc.roundedRect(x, y, 52, 52, 10).fillAndStroke(brand.white, brand.border);
    doc.circle(x + 26, y + 26, 18).fill(brand.primary);
    doc.circle(x + 26, y + 26, 11).strokeColor(brand.surfaceStrong).lineWidth(2).stroke();
    doc.fillColor(brand.white).font('Helvetica-Bold').fontSize(15).text('MS', x, y + 18, {
        width: 52,
        align: 'center',
    });
    doc.restore();
}

function addInfoPair(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
    doc.fillColor(brand.muted).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), x, y, {
        width,
    });
    doc.fillColor(brand.ink).font('Helvetica').fontSize(10).text(value, x, y + 12, {
        width,
    });
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number) {
    doc
        .fillColor(brand.primaryDark)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(title.toUpperCase(), 48, y);
    doc.moveTo(48, y + 16).lineTo(547, y + 16).strokeColor(brand.border).lineWidth(1).stroke();
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, requiredHeight: number) {
    if (y + requiredHeight <= 744) {
        return y;
    }

    doc.addPage();
    return 48;
}

function addRowBackground(doc: PDFKit.PDFDocument, y: number, height: number, fill: string) {
    doc.save();
    doc.roundedRect(48, y, 499, height, 5).fill(fill);
    doc.restore();
}

function addText(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number, options: PDFKit.Mixins.TextOptions = {}) {
    doc.text(text, x, y, {
        width,
        lineGap: 2,
        ...options,
    });
}

function addTableHeader(doc: PDFKit.PDFDocument, y: number) {
    addRowBackground(doc, y, 26, brand.primary);
    doc.fillColor(brand.white).font('Helvetica-Bold').fontSize(8.5);
    addText(doc, 'Line item', 58, y + 8, 245);
    addText(doc, 'Qty', 314, y + 7, 42, { align: 'right' });
    addText(doc, 'Unit price', 365, y + 7, 68, { align: 'right' });
    addText(doc, 'TVSH', 442, y + 7, 38, { align: 'right' });
    addText(doc, 'Line total', 488, y + 7, 49, { align: 'right' });
}

function addInvoiceHeader(doc: PDFKit.PDFDocument, billing: BillingView) {
    doc.save();
    doc.rect(0, 0, 595, 172).fill(brand.surface);
    doc.rect(0, 0, 595, 8).fill(brand.primary);
    doc.rect(0, 8, 595, 3).fill(brand.accent);
    doc.restore();

    addLogo(doc, 48, 38);

    doc.fillColor(brand.ink).font('Helvetica-Bold').fontSize(22).text(clinicDetails.name, 112, 42);
    doc
        .fillColor(brand.muted)
        .font('Helvetica')
        .fontSize(9)
        .text(clinicDetails.legalName, 112, 68)
        .text(clinicDetails.address, 112, 82)
        .text(`${clinicDetails.phone} | ${clinicDetails.email}`, 112, 96)
        .text(clinicDetails.website, 112, 110);

    doc
        .fillColor(brand.primaryDark)
        .font('Helvetica-Bold')
        .fontSize(24)
        .text('INVOICE', 370, 42, { width: 177, align: 'right' });
    doc
        .fillColor(brand.muted)
        .font('Helvetica')
        .fontSize(9)
        .text('Tax invoice with TVSH details', 370, 72, { width: 177, align: 'right' });

    doc.roundedRect(362, 94, 185, 70, 9).fillAndStroke(brand.white, brand.border);
    addInfoPair(doc, 'Invoice No.', billing.billingNumber, 374, 105, 96);
    addInfoPair(doc, 'Amount Due', formatMoney(billing.outstandingAmount), 478, 105, 57);

    const statusColor = billing.outstandingAmount > 0 ? brand.accent : brand.success;
    doc.roundedRect(374, 145, 76, 15, 7).fill(statusColor);
    doc.fillColor(brand.white).font('Helvetica-Bold').fontSize(7.5).text(formatLabel(billing.status), 374, 149, {
        width: 76,
        align: 'center',
    });

    doc.moveTo(48, 172).lineTo(547, 172).strokeColor(brand.border).lineWidth(1).stroke();
}

function addParties(doc: PDFKit.PDFDocument, billing: BillingView) {
    doc.roundedRect(48, 194, 235, 148, 8).fillAndStroke(brand.surface, brand.border);
    doc.roundedRect(312, 194, 235, 148, 8).fillAndStroke(brand.white, brand.border);

    doc.fillColor(brand.primaryDark).font('Helvetica-Bold').fontSize(9).text('FROM', 62, 208);
    doc.fillColor(brand.ink).font('Helvetica-Bold').fontSize(12).text(clinicDetails.name, 62, 225);
    doc
        .fillColor(brand.muted)
        .font('Helvetica')
        .fontSize(9)
        .text(clinicDetails.address, 62, 243, { width: 195 })
        .text(clinicDetails.email, 62, 257, { width: 195 })
        .text(clinicDetails.phone, 62, 271, { width: 195 })
        .text(`Business No: ${clinicDetails.businessNumber}`, 62, 293, { width: 195 })
        .text(`TVSH No: ${clinicDetails.tvshNumber}`, 62, 306, { width: 195 });

    doc.fillColor(brand.primaryDark).font('Helvetica-Bold').fontSize(9).text('BILL TO', 326, 208);
    doc.fillColor(brand.ink).font('Helvetica-Bold').fontSize(12).text(billing.patient.name, 326, 225, {
        width: 195,
    });
    doc
        .fillColor(brand.muted)
        .font('Helvetica')
        .fontSize(9)
        .text(billing.patient.email ?? 'Email: N/A', 326, 247, { width: 195 })
        .text(billing.patient.phone ?? 'Phone: N/A', 326, 261, { width: 195 });

    const appointmentLine = billing.appointment
        ? `${formatDate(billing.appointment.scheduledAt)} - ${billing.appointment.service.name}`
        : 'Appointment: N/A';
    doc.text(appointmentLine, 326, 286, { width: 195 });
    doc.fontSize(8).text(`Patient ID: ${billing.patientId}`, 326, 310, { width: 195, lineGap: 2 });
}

function addInvoiceMeta(doc: PDFKit.PDFDocument, billing: BillingView) {
    const y = 362;

    addInfoPair(doc, 'Issued', formatDate(billing.issuedAt), 48, y, 112);
    addInfoPair(doc, 'Due', formatDate(billing.dueDate), 172, y, 112);
    addInfoPair(doc, 'Paid', formatDate(billing.paidAt), 296, y, 112);
    addInfoPair(doc, 'Balance', formatMoney(billing.outstandingAmount), 420, y, 112);
}

function addLineItems(doc: PDFKit.PDFDocument, billing: BillingView, startY: number) {
    addSectionTitle(doc, 'Invoice items', startY);
    let y = startY + 30;

    addTableHeader(doc, y);
    y += 30;

    if (billing.items.length === 0) {
        addRowBackground(doc, y, 38, '#ffffff');
        doc.fillColor(brand.muted).font('Helvetica').fontSize(9);
        addText(doc, 'No line items listed.', 58, y + 13, 450);
        return y + 48;
    }

    billing.items.forEach((item, index) => {
        y = ensureSpace(doc, y, 56);
        const height = Math.max(38, doc.heightOfString(item.description, { width: 245 }) + 20);
        addRowBackground(doc, y, height, index % 2 === 0 ? '#ffffff' : brand.surface);

        doc.fillColor(brand.ink).font('Helvetica').fontSize(9);
        addText(doc, item.description, 58, y + 10, 245);
        addText(doc, String(item.quantity), 314, y + 10, 42, { align: 'right' });
        addText(doc, formatMoney(item.unitPrice), 365, y + 10, 68, { align: 'right' });
        addText(doc, billing.taxAmount > 0 ? 'Incl.' : '0%', 442, y + 10, 38, { align: 'right' });
        doc.font('Helvetica-Bold');
        addText(doc, formatMoney(item.totalPrice), 488, y + 10, 49, { align: 'right' });
        doc.font('Helvetica');

        y += height + 8;
    });

    return y;
}

function addTotals(doc: PDFKit.PDFDocument, billing: BillingView, startY: number) {
    const y = ensureSpace(doc, startY, 222);

    const leftX = 48;
    const rightX = 330;
    const panelY = y + 28;
    const instructionHeight = billing.notes ? 138 : 112;

    addSectionTitle(doc, 'Payment instructions', y);
    doc.roundedRect(leftX, panelY, 252, instructionHeight, 8).fillAndStroke(brand.surface, brand.border);
    doc
        .fillColor(brand.ink)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(clinicDetails.bankName, leftX + 14, panelY + 14, { width: 220 });
    doc
        .fillColor(brand.muted)
        .font('Helvetica')
        .fontSize(8.5)
        .text(`IBAN: ${clinicDetails.iban}`, leftX + 14, panelY + 30, { width: 220 })
        .text(`Reference: ${billing.billingNumber}`, leftX + 14, panelY + 44, { width: 220 })
        .text(clinicDetails.paymentTerms, leftX + 14, panelY + 60, { width: 220, lineGap: 2 });

    if (billing.notes) {
        doc
            .fillColor(brand.muted)
            .font('Helvetica')
            .fontSize(8.5)
            .text(`Notes: ${billing.notes}`, leftX + 14, panelY + 100, { width: 220, lineGap: 2 });
    }

    doc.roundedRect(rightX, panelY, 217, 166, 8).fillAndStroke(brand.surface, brand.border);
    doc.fillColor(brand.primaryDark).font('Helvetica-Bold').fontSize(9).text('INVOICE TOTALS', rightX + 14, panelY + 14);

    const rows = [
        ['Subtotal', formatMoney(billing.subtotal)],
        ['TVSH / VAT', formatMoney(billing.taxAmount)],
        ['Discount', `-${formatMoney(billing.discountAmount)}`],
        ['Total', formatMoney(billing.totalAmount)],
        ['Paid', formatMoney(billing.amountPaid)],
        ['Outstanding', formatMoney(billing.outstandingAmount)],
    ];

    rows.forEach(([label, value], index) => {
        const rowY = panelY + 38 + index * 18;
        const isTotal = label === 'Total' || label === 'Outstanding';
        if (label === 'Total') {
            doc.moveTo(rightX + 14, rowY - 5).lineTo(rightX + 203, rowY - 5).strokeColor(brand.border).stroke();
        }
        doc
            .fillColor(isTotal ? brand.ink : brand.muted)
            .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(isTotal ? 10 : 9)
            .text(label, rightX + 14, rowY, { width: 92 });
        doc
            .fillColor(isTotal && label === 'Outstanding' ? brand.primaryDark : brand.ink)
            .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(isTotal ? 10 : 9)
            .text(value, rightX + 112, rowY, { width: 88, align: 'right' });
    });

    return Math.max(panelY + instructionHeight, panelY + 166) + 18;
}

function addPayments(doc: PDFKit.PDFDocument, billing: BillingView, startY: number) {
    let y = ensureSpace(doc, startY, 96);

    addSectionTitle(doc, 'Payments', y);
    y += 30;

    if (billing.payments.length === 0) {
        doc.fillColor(brand.muted).font('Helvetica').fontSize(9).text('No payments recorded yet.', 48, y);
        return y + 24;
    }

    billing.payments.forEach((payment) => {
        y = ensureSpace(doc, y, 30);
        doc.fillColor(brand.ink).font('Helvetica-Bold').fontSize(9).text(formatMoney(payment.amount), 48, y);
        doc
            .fillColor(brand.muted)
            .font('Helvetica')
            .fontSize(9)
            .text(
                `${formatLabel(payment.paymentMethod)} | ${formatDate(payment.paidAt)} | Ref: ${payment.referenceNumber ?? 'N/A'}`,
                150,
                y,
                { width: 360 },
            );
        y += 22;
    });

    return y + 10;
}

function addFooter(doc: PDFKit.PDFDocument) {
    doc.moveTo(48, 744).lineTo(547, 744).strokeColor(brand.border).lineWidth(1).stroke();
    doc
        .fillColor(brand.muted)
        .font('Helvetica')
        .fontSize(8)
        .text('Generated by MedSphere. This invoice is produced from billing records connected to patient care workflows.', 48, 754, {
            width: 350,
        })
        .text(`${clinicDetails.name} | ${clinicDetails.tvshNumber}`, 397, 754, {
            width: 150,
            align: 'right',
        });
}

export class BillingPdfService {
    static fileName(billing: BillingView) {
        return buildBillingPdfFileName(billing);
    }

    async build(billing: BillingView): Promise<Buffer> {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 48,
            info: {
                Title: `Invoice ${billing.billingNumber}`,
                Author: clinicDetails.name,
                Subject: 'Billing invoice',
            },
        });
        const pdf = collectPdf(doc);

        addInvoiceHeader(doc, billing);
        addParties(doc, billing);
        addInvoiceMeta(doc, billing);
        const afterItemsY = addLineItems(doc, billing, 398);
        const afterTotalsY = addTotals(doc, billing, afterItemsY + 6);
        addPayments(doc, billing, afterTotalsY);
        addFooter(doc);

        doc.end();

        return pdf;
    }
}
