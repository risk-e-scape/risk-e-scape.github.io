#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { parseRecords } = require('./lib/csv');
const { formatDate } = require('./lib/dates');

const ROOT = __dirname;
const ROSTER = path.join(ROOT, 'participants', 'participants.csv');
const OUTPUT = path.join(ROOT, 'certificate-pdfs');
const LOGOS = path.join(ROOT, 'src', 'assets', 'logos');
const BENGALI_FONT = path.join(ROOT, 'node_modules', '@fontsource', 'noto-serif-bengali', 'files',
  'noto-serif-bengali-bengali-700-normal.woff');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const draft = process.argv.includes('--draft');

/* Drafts intentionally have no issue date yet, so an unset date renders as
   "To be confirmed" on the certificate rather than as a blank or a raw value. */
const UNSET_DATE = 'To be confirmed';

function drawImageIfPresent(doc, file, x, y, options) {
  if (fs.existsSync(file)) doc.image(file, x, y, options);
}

function drawSingleLine(doc, text, y, width, color, maxSize, minSize) {
  let size = maxSize;
  doc.font('Helvetica-Bold').fontSize(size);
  while (doc.widthOfString(text) > width && size > minSize) {
    size -= 0.5;
    doc.fontSize(size);
  }
  const x = (doc.page.width - doc.widthOfString(text)) / 2;
  doc.fillColor(color).font('Helvetica-Bold').fontSize(size).text(text, x, y, { lineBreak: false });
}

function drawParticipantName(doc, name, y, green) {
  const runs = String(name).match(/[\u0980-\u09FF]+|[^\u0980-\u09FF]+/g) || [''];
  let size = 31;
  const measure = () => runs.reduce((total, run) => {
    doc.font(/[\u0980-\u09FF]/.test(run) ? 'NotoSerifBengali' : 'Times-Bold').fontSize(size);
    return total + doc.widthOfString(run);
  }, 0);
  let totalWidth = measure();
  while (totalWidth > 610 && size > 20) {
    size -= 1;
    totalWidth = measure();
  }
  let x = (doc.page.width - totalWidth) / 2;
  for (const run of runs) {
    doc.font(/[\u0980-\u09FF]/.test(run) ? 'NotoSerifBengali' : 'Times-Bold')
      .fontSize(size).fillColor(green).text(run, x, y, { lineBreak: false });
    x += doc.widthOfString(run);
  }
}

function addWatermark(doc) {
  doc.save();
  doc.opacity(0.08);
  doc.fillColor('#14532d').font('Helvetica-Bold').fontSize(76);
  doc.rotate(-32, { origin: [421, 298] });
  doc.text('DRAFT — NOT VALID FOR ISSUE', 95, 260, { width: 650, align: 'center' });
  doc.restore();
}

function coursePeriod(batch, template) {
  const period = template.batches && template.batches[String(batch)];
  if (!period || !/^\d{4}-\d{2}-\d{2}$/.test(period.startDate || '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(period.endDate || '')) {
    throw new Error(`Add a valid startDate and endDate for Batch ${batch} in config.json certificate.batches`);
  }
  return period;
}

function assertApprovedTemplate(template) {
  const signatories = Array.isArray(template.signatories) ? template.signatories : [];
  const missing = [];
  if (template.status !== 'approved') missing.push('certificate.status must be "approved"');
  if (!template.completionStatement || /to be confirmed/i.test(template.completionStatement)) {
    missing.push('certificate.completionStatement');
  }
  if (!signatories.length || signatories.some((signatory) =>
    !signatory.name || !signatory.role || /to be confirmed/i.test(`${signatory.name} ${signatory.role}`))) {
    missing.push('approved certificate.signatories');
  }
  if (missing.length) {
    throw new Error(`Final certificate generation is locked until the coordinator confirms: ${missing.join(', ')}`);
  }
}

function createPdf(record, template, outputDir) {
  return new Promise(async (resolve, reject) => {
    try {
      const id = record.certificate_id;
      const verificationUrl = `${config.baseUrl}/c/${id}/`;
      const filename = path.join(outputDir, `${id}.pdf`);
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: {
        Title: `${config.programme.name} — ${id}`,
        Author: config.programme.host,
        Subject: 'Certificate record verified at ' + verificationUrl
      } });
      const stream = fs.createWriteStream(filename);
      stream.on('error', reject);
      stream.on('finish', resolve);
      doc.pipe(stream);
      if (fs.existsSync(BENGALI_FONT)) doc.registerFont('NotoSerifBengali', BENGALI_FONT);

      const width = doc.page.width;
      const height = doc.page.height;
      const green = '#14532d';
      const red = '#9e2a2b';
      const muted = '#4b5563';
      const logo = path.join(LOGOS, config.brand.logo);
      const eu = path.join(LOGOS, config.euFunding.file);
      const du = path.join(LOGOS, 'du.png');
      const qr = await QRCode.toBuffer(verificationUrl, {
        type: 'png', width: 500, margin: 2, errorCorrectionLevel: 'H'
      });

      doc.rect(0, 0, width, height).fill('#ffffff');
      doc.lineWidth(10).strokeColor(green).rect(18, 18, width - 36, height - 36).stroke();
      doc.lineWidth(1.5).strokeColor(red).rect(32, 32, width - 64, height - 64).stroke();

      drawImageIfPresent(doc, logo, 58, 54, { fit: [215, 46] });
      drawImageIfPresent(doc, du, 617, 50, { fit: [65, 55] });
      drawImageIfPresent(doc, eu, 704, 56, { fit: [95, 44] });

      doc.fillColor(green).font('Helvetica-Bold').fontSize(10)
        .text(config.programme.host.toUpperCase(), 120, 112, { width: 602, align: 'center', characterSpacing: 1.1 });
      doc.fillColor(red).font('Times-Bold').fontSize(31)
        .text('CERTIFICATE OF COMPLETION', 104, 136, { width: 635, align: 'center', characterSpacing: 0.7 });
      doc.fillColor(muted).font('Helvetica').fontSize(12)
        .text('This certificate is presented to', 104, 188, { width: 635, align: 'center' });

      drawParticipantName(doc, record.name, 210, green);
      doc.moveTo(205, 258).lineTo(637, 258).lineWidth(0.7).strokeColor(red).stroke();

      const period = coursePeriod(record.batch, template);
      doc.fillColor(muted).font('Helvetica').fontSize(11.5)
        .text(template.completionStatement, 130, 273, { width: 583, align: 'center' });
      drawSingleLine(doc, config.programme.fullTitle, 294, 650, green, 14, 9);
      doc.fillColor(muted).font('Helvetica').fontSize(10.5)
        .text(`Batch ${record.batch} · ${formatDate(period.startDate, UNSET_DATE)} to ${formatDate(period.endDate, UNSET_DATE)}`, 130, 316, { width: 583, align: 'center' });
      doc.fillColor(muted).font('Helvetica').fontSize(9.5)
        .text(`Issued by ${config.programme.host}`, 130, 334, { width: 583, align: 'center' });

      const signatories = draft
        ? [{ name: 'Signatory to be confirmed', role: 'Course coordination' },
           { name: 'Signatory to be confirmed', role: 'Authorised institutional signatory' }]
        : template.signatories;
      const lineY = 420;
      signatories.slice(0, 2).forEach((signatory, index) => {
        const x = index === 0 ? 145 : 445;
        doc.moveTo(x, lineY).lineTo(x + 190, lineY).lineWidth(0.6).strokeColor(muted).stroke();
        doc.fillColor(green).font('Helvetica-Bold').fontSize(9)
          .text(signatory.name, x, lineY + 8, { width: 190, align: 'center' });
        doc.fillColor(muted).font('Helvetica').fontSize(8)
          .text(signatory.role, x, lineY + 21, { width: 190, align: 'center' });
      });

      doc.fillColor(green).font('Helvetica-Bold').fontSize(10)
        .text(`Certificate ID: ${id}`, 74, 518, { width: 330 });
      doc.fillColor(muted).font('Helvetica').fontSize(8.5)
        .text(`Batch ${record.batch} · Issue date: ${formatDate(record.issued, UNSET_DATE)}`, 74, 533, { width: 360 });
      doc.image(qr, 698, 430, { fit: [88, 88] });
      doc.fillColor(green).font('Helvetica-Bold').fontSize(8.5)
        .text('Scan to verify', 686, 521, { width: 112, align: 'center' });
      const printedUrl = `risk-e-scape.github.io/c/${id}`;
      doc.fillColor(muted).font('Helvetica').fontSize(6.5)
        .text(printedUrl, 654, 536, { width: 175, align: 'center', lineBreak: false });

      if (draft) addWatermark(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function main() {
  if (!fs.existsSync(ROSTER)) {
    throw new Error('Private roster not found: participants/participants.csv');
  }
  const template = config.certificate || {};
  if (!draft) assertApprovedTemplate(template);
  const records = parseRecords(fs.readFileSync(ROSTER, 'utf8'));
  const selected = draft
    ? records.filter((record) => record.certificate_id)
    : records.filter((record) => record.certificate_id && record.status !== 'revoked');
  if (!selected.length) {
    throw new Error(draft
      ? 'No certificate IDs exist. Run npm run drafts first.'
      : 'No non-revoked records exist to generate.');
  }
  selected.forEach((record) => coursePeriod(record.batch, template));
  if (!draft) {
    const missingDate = selected.filter((record) => !/^\d{4}-\d{2}-\d{2}$/.test(record.issued || ''));
    if (missingDate.length) {
      throw new Error(`Add a YYYY-MM-DD issue date before generating final PDFs: ${missingDate.map((record) => record.certificate_id).join(', ')}`);
    }
  }

  const runLabel = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = draft ? path.join(OUTPUT, `draft-${runLabel}`) : OUTPUT;
  fs.mkdirSync(outputDir, { recursive: true });
  for (const record of selected) await createPdf(record, template, outputDir);

  console.log(`\nGenerated ${selected.length} ${draft ? 'draft ' : ''}certificate PDF${selected.length === 1 ? '' : 's'} in ${path.relative(ROOT, outputDir)}/.`);
  if (draft) console.log('Every file is watermarked DRAFT — NOT VALID FOR ISSUE.\n');
}

main().catch((error) => {
  console.error('\nCould not generate certificates:\n' + error.message + '\n');
  process.exit(1);
});
