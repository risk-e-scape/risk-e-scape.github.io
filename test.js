#!/usr/bin/env node
/* Checks the built site in docs/.
   Run `node test.js --build` to build first, then check.

   These cover the things that would be quiet and damaging if they broke:
   escaping, what gets published, and what must never be. */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'docs');
const PEOPLE = path.join(ROOT, 'participants');

if (process.argv.includes('--build')) {
  execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { stdio: 'inherit' });
}
if (!fs.existsSync(OUT)) {
  console.error('docs/ does not exist — run the build first.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

/* Minimal CSV read, matching build.js. Enough for the dummy data. */
function readCsv(file) {
  const rows = [];
  let row = [], field = '', quoted = false, i = 0;
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { quoted = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const keep = rows.filter((r) => r.some((v) => v.trim() !== ''));
  const header = keep[0].map((h) => h.trim().toLowerCase());
  return keep.slice(1).map((cells) => {
    const o = {};
    header.forEach((h, n) => { o[h] = (cells[n] || '').trim(); });
    if (!o.status) o.status = 'issued';
    o._batch = parseInt(path.basename(file).match(/batch-(\d+)/)[1], 10);
    return o;
  });
}

const records = fs.readdirSync(PEOPLE)
  .filter((f) => /^batch-\d+\.csv$/i.test(f))
  .flatMap((f) => readCsv(path.join(PEOPLE, f)));

let pass = 0, fail = 0;
function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; return; }
  fail++;
  console.log('FAIL  ' + label +
    '\n  expected ' + JSON.stringify(expected) +
    '\n  actual   ' + JSON.stringify(actual));
}

const recordPage = (id) => {
  const p = path.join(OUT, 'c', id, 'index.html');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
};
const byStatus = (s) => records.filter((r) => r.status === s);

function allFiles(dir) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else out.push(p);
    }
  })(dir);
  return out;
}
const allHtml = allFiles(OUT).filter((f) => f.endsWith('.html'))
  .map((f) => fs.readFileSync(f, 'utf8'));

/* --- what gets published -------------------------------------------- */

check('a page exists for every issued record',
  byStatus('issued').every((r) => recordPage(r.certificate_id) !== null), true);
check('a page exists for every revoked record',
  byStatus('revoked').every((r) => recordPage(r.certificate_id) !== null), true);
check('NO page exists for a pending record',
  byStatus('pending').every((r) => recordPage(r.certificate_id) === null), true);
check('core pages built',
  ['index.html', 'course.html', 'verify/index.html', '404.html', '.nojekyll']
    .every((f) => fs.existsSync(path.join(OUT, f))), true);

/* --- certificate IDs -------------------------------------------------- */

check('every row has an ID',
  records.every((r) => /^RES-B\d+-\d{4}-[A-Z0-9]{4}$/.test(r.certificate_id)), true);
check('IDs are unique across all batches',
  new Set(records.map((r) => r.certificate_id)).size, records.length);
check('ID batch number matches the file it is in',
  records.every((r) => r.certificate_id.startsWith('RES-B' + r._batch + '-')), true);

/* --- escaping --------------------------------------------------------- */

const xss = records.find((r) => r.name.includes('<script>'));
check('injected markup is escaped, not emitted',
  recordPage(xss.certificate_id).includes('<script>alert('), false);
check('injected markup survives as visible text',
  recordPage(xss.certificate_id).includes('&lt;script&gt;'), true);

const apostrophe = records.find((r) => r.name.includes("O'Sullivan"));
check('apostrophe in a name is escaped',
  recordPage(apostrophe.certificate_id).includes('O&#39;Sullivan'), true);

const bangla = records.find((r) => /[ঀ-৿]/.test(r.name));
check('Bangla-script name is emitted intact',
  recordPage(bangla.certificate_id).includes(bangla.name), true);

const comma = records.find((r) => r.name.includes(','));
check('a name containing a comma survives the CSV round trip',
  comma && recordPage(comma.certificate_id).includes(comma.name), true);

/* --- revoked ---------------------------------------------------------- */

const revoked = byStatus('revoked')[0];
const revPage = recordPage(revoked.certificate_id);
check('revoked page says so', revPage.includes('has been revoked'), true);
check('revoked page offers no PDF link', revPage.includes('class="dl"'), false);
check('revoked page shows no Drive URL', revPage.includes('drive.google.com'), false);

/* --- data hygiene ------------------------------------------------------ */

const forbidden = ['email', 'phone', 'address', 'nid', 'grade', 'marks', 'dob'];
check('participant files carry no fields beyond the certificate',
  records.some((r) => forbidden.some((k) => r[k])), false);
check('no participant email address anywhere in the build',
  allHtml.some((h) => /@(gmail|yahoo|hotmail|outlook)\./i.test(h)), false);
check('no PDF committed to the site',
  allFiles(OUT).some((f) => f.endsWith('.pdf')), false);
check('every issued record links to Drive, not a local file',
  byStatus('issued').every((r) => r.pdf_link.startsWith('https://drive.google.com/')), true);
check('no participant name appears on the home page',
  records.some((r) => fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').includes(r.name)),
  false);

/* --- record page contents ---------------------------------------------- */

const sample = byStatus('issued')[0];
const sp = recordPage(sample.certificate_id);
check('record page shows the certificate ID', sp.includes(sample.certificate_id), true);
check('record page shows the SHA-256', sp.includes(sample.sha256), true);
check('record page is noindex', sp.includes('name="robots" content="noindex"'), true);
check('record page links the PDF', sp.includes(sample.pdf_link), true);

/* --- assets and footer -------------------------------------------------- */

const logoDir = path.join(OUT, 'assets', 'logos');
check('every partner logo referenced is present',
  config.partners.filter((p) => !fs.existsSync(path.join(logoDir, p.file))).map((p) => p.file),
  []);
check('EU emblem present', fs.existsSync(path.join(logoDir, config.euFunding.file)), true);
check('EU disclaimer on every page',
  allHtml.every((h) => h.includes('Funded by the European Union')), true);

/* --- the frozen URL ------------------------------------------------------ */

check('placeholder flag has been cleared (baseUrl is locked in)',
  '_baseUrl_TODO' in config, false);
check('baseUrl is the risk-e-scape.github.io root, no repo sub-path',
  config.baseUrl, 'https://risk-e-scape.github.io');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
