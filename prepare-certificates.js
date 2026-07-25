#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const QRCode = require('qrcode');
const { parseRecords, sanitizeName, csvField } = require('./lib/csv');

const ROOT = __dirname;
const ROSTER = path.join(ROOT, 'participants', 'participants.csv');
const OUTPUT = path.join(ROOT, 'certificate-materials');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

async function main() {
  if (!fs.existsSync(ROSTER)) {
    console.error('\nRoster not found: participants/participants.csv');
    console.error('It is tracked in this repository — restore it with "git checkout participants/participants.csv".\n');
    process.exit(1);
  }

  execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { stdio: 'inherit' });
  const records = parseRecords(fs.readFileSync(ROSTER, 'utf8'));
  const ready = records.filter((record) => record.certificate_id);

  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });

  const summary = [['certificate_id', 'name', 'status', 'verification_url', 'qr_png', 'qr_svg']];
  for (const record of ready) {
    const id = record.certificate_id;
    const url = `${config.baseUrl}/c/${id}/`;
    const pngName = `${id}.png`;
    const svgName = `${id}.svg`;
    await QRCode.toFile(path.join(OUTPUT, pngName), url, {
      type: 'png', width: 1200, margin: 4, errorCorrectionLevel: 'H'
    });
    await QRCode.toFile(path.join(OUTPUT, svgName), url, {
      type: 'svg', margin: 4, errorCorrectionLevel: 'H'
    });
    /* sanitizeName, not the raw value: HOW-TO tells the coordinator to open
       verification-links.csv in Excel or Google Sheets, and a name beginning
       =, +, - or @ is a formula there. build.js guards participants.csv on
       write; this is the same guard for the file derived from it. */
    summary.push([id, sanitizeName(record.name), record.status || 'issued', url, pngName, svgName]);
  }

  const csv = summary.map((row) => row.map(csvField).join(',')).join('\n') + '\n';
  fs.writeFileSync(path.join(OUTPUT, 'verification-links.csv'), csv, 'utf8');

  console.log(`\nCertificate materials prepared for ${ready.length} record${ready.length === 1 ? '' : 's'}:`);
  console.log('  certificate-materials/verification-links.csv');
  console.log('  certificate-materials/<CERTIFICATE_ID>.png');
  console.log('  certificate-materials/<CERTIFICATE_ID>.svg');
  console.log('\nThese files stay on this computer and are ignored by Git.');
  console.log('Replace the placeholder names in participants.csv before issuance.\n');
}

main().catch((error) => {
  console.error('\nCould not prepare certificate materials:\n' + error.message + '\n');
  process.exit(1);
});
