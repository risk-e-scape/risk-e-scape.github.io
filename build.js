#!/usr/bin/env node
/* Builds the certificate site into docs/ for GitHub Pages.
   No dependencies — plain Node.

   Reads every participants/batch-*.csv, writes one page per certificate:

       <baseUrl>/c/RES-B2-0001-HN24/

   Those pages are plain HTML: no JavaScript, no server, nothing to break.

   Leave certificate_id blank in the CSV and this fills it in with a new
   ID, then saves it back to the file. Existing IDs are never touched —
   once an ID is printed on a certificate it must stay that way forever.

   Edit: config.json, participants/*.csv, src/
   Never edit: docs/ — it is regenerated from scratch on every build. */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs');
const PEOPLE = path.join(ROOT, 'participants');

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const P = config.programme;

const ID_RE = /^RES-B\d+-\d{4}-[A-Z0-9]{4}$/;
const COLUMNS = ['certificate_id', 'name', 'completed', 'issued', 'status',
                 'pdf_link', 'revoked_on'];

/* Characters that cannot be confused when read off a printed certificate:
   no 0/O, no 1/I/L. Someone will always have to type one of these by hand. */
const ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false, i = 0;
  text = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

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
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

function csvField(v) {
  v = v == null ? '' : String(v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function toCsv(records) {
  const lines = [COLUMNS.join(',')];
  for (const r of records) lines.push(COLUMNS.map((c) => csvField(r[c])).join(','));
  return lines.join('\n') + '\n';
}

/* ------------------------------------------------------------------ */
/* participants                                                        */
/* ------------------------------------------------------------------ */

function batchFiles() {
  if (!fs.existsSync(PEOPLE)) return [];
  return fs.readdirSync(PEOPLE)
    .filter((f) => /^batch-\d+\.csv$/i.test(f))
    .sort((a, b) => batchNumber(a) - batchNumber(b));
}

function batchNumber(filename) {
  return parseInt(filename.match(/batch-(\d+)\.csv/i)[1], 10);
}

function readBatch(filename) {
  const full = path.join(PEOPLE, filename);
  const rows = parseCsv(fs.readFileSync(full, 'utf8'));
  const problems = [];

  if (!rows.length) return { records: [], problems };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  for (const col of ['certificate_id', 'name']) {
    if (!header.includes(col)) {
      problems.push(`${filename}: missing a "${col}" column in the first row`);
    }
  }
  if (problems.length) return { records: [], problems };

  const records = rows.slice(1).map((cells, idx) => {
    const rec = { _file: filename, _line: idx + 2, batch: batchNumber(filename) };
    header.forEach((h, i) => { rec[h] = (cells[i] || '').trim(); });
    if (!rec.status) rec.status = 'issued';   // blank means issued
    rec.status = rec.status.toLowerCase();
    return rec;
  });

  return { records, problems };
}

/* Only ever fills blanks. An ID already in the file is left alone, because
   it may already be printed on paper. */
function assignMissingIds(filename, records) {
  const batch = batchNumber(filename);
  const used = new Set(records.map((r) => r.certificate_id).filter(Boolean));
  let next = 0;
  for (const r of records) {
    const m = /^RES-B\d+-(\d{4})-/.exec(r.certificate_id || '');
    if (m) next = Math.max(next, parseInt(m[1], 10));
  }

  let assigned = 0;
  for (const r of records) {
    if (r.certificate_id) continue;
    let id;
    do {
      next++;
      const seq = String(next).padStart(4, '0');
      let suffix = '';
      for (let i = 0; i < 4; i++) {
        suffix += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
      }
      id = `RES-B${batch}-${seq}-${suffix}`;
    } while (used.has(id));
    used.add(id);
    r.certificate_id = id;
    assigned++;
  }

  if (assigned) {
    fs.writeFileSync(path.join(PEOPLE, filename), toCsv(records), 'utf8');
  }
  return assigned;
}

function checkRecords(records) {
  const problems = [];
  const seen = new Map();

  for (const r of records) {
    const where = `${r._file} line ${r._line}`;

    if (!r.name) problems.push(`${where}: no name`);
    if (!ID_RE.test(r.certificate_id)) {
      problems.push(`${where}: "${r.certificate_id}" is not a valid certificate ID ` +
                    `(expected something like RES-B2-0001-HN24)`);
    }
    if (seen.has(r.certificate_id)) {
      problems.push(`${where}: certificate ID ${r.certificate_id} is already used on ` +
                    `${seen.get(r.certificate_id)}`);
    }
    seen.set(r.certificate_id, where);

    if (!['issued', 'revoked', 'pending'].includes(r.status)) {
      problems.push(`${where}: status "${r.status}" is not one of issued, revoked, pending`);
    }
    if (r.status === 'issued') {
      if (!r.pdf_link) problems.push(`${where}: marked issued but has no pdf_link`);
      if (!r.issued) problems.push(`${where}: marked issued but has no issued date`);
    }
    /* Refuse to publish anything the certificate itself does not carry.
       This is the only thing standing between a stray spreadsheet column
       and a public repository. */
    for (const bad of ['email', 'phone', 'address', 'nid', 'grade', 'marks', 'dob']) {
      if (r[bad]) problems.push(`${where}: column "${bad}" must never be published — remove it`);
    }
  }
  return problems;
}

/* ------------------------------------------------------------------ */
/* html helpers                                                        */
/* ------------------------------------------------------------------ */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function prefix(depth) { return depth === 0 ? '' : '../'.repeat(depth); }

function write(relPath, html) {
  const full = path.join(OUT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html, 'utf8');
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, e.name), d = path.join(to, e.name);
    if (e.isDirectory()) n += copyDir(s, d); else { fs.copyFileSync(s, d); n++; }
  }
  return n;
}

function head(title, depth, extra) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${prefix(depth)}assets/css/site.css">
${extra || ''}</head>
<body>`;
}

function header(current, depth) {
  const p = prefix(depth);
  // "./" rather than "" at depth 0: a bare href="" would still work (it
  // means "this document"), but "./" reads as an intentional link on the
  // homepage's own nav rather than a leftover empty attribute.
  const home = depth === 0 ? './' : p;
  const on = (page) => (page === current ? ' aria-current="page"' : '');
  const mark = config.brand && config.brand.logo
    ? `<img src="${p}assets/logos/${esc(config.brand.logo)}" alt="RISK-E-SCAPE"
           onerror="this.outerHTML='<span class=\\'r\\'>RISK</span><span class=\\'e\\'>-E-</span><span class=\\'s\\'>SCAPE</span>'">`
    : `<span class="r">RISK</span><span class="e">-E-</span><span class="s">SCAPE</span>`;

  return `
<header class="site">
  <div class="wrap">
    <a class="wordmark" href="${home}">${mark}</a>
    <nav class="site">
      <a href="${home}"${on('home')}>Home</a>
      <a href="${p}course/"${on('course')}>The Course</a>
      <a href="${p}verify/"${on('verify')}>Verify a Certificate</a>
    </nav>
  </div>
</header>`;
}

/* Logos only — the marks identify the consortium without a wall of
   institution names. Each links out and carries its name as alt text
   and tooltip, so nothing is lost for screen readers. */
function partnerLogos(depth) {
  const p = prefix(depth);
  return config.partners.map((x) => `
    <a class="logo" href="${esc(x.site)}" target="_blank" rel="noopener noreferrer"
       title="${esc(x.name)}">
      <img src="${p}assets/logos/${esc(x.file)}" alt="${esc(x.name)}"
           onerror="this.outerHTML='<span class=\\'logo-missing\\'>${esc(x.short)}</span>'">
    </a>`).join('');
}

function footer(depth) {
  const p = prefix(depth);
  const eu = config.euFunding;
  return `
<footer class="site">
  <div class="wrap">
    <div class="cols">
      <div>
        <h4>Course coordination</h4>
        <p>${esc(P.host)}</p>
        <p>${esc(P.address)}</p>
        <p><a href="mailto:${esc(P.contactEmail)}">${esc(P.contactEmail)}</a></p>
      </div>
      <div>
        <h4>Certificates</h4>
        <p><a href="${p}verify/">Verify a certificate</a></p>
        <p><a href="${p}course/">About the course</a></p>
      </div>
      <div>
        <h4>Funding</h4>
        <div class="eu-block">
          <img src="${p}assets/logos/${esc(eu.file)}" alt="${esc(eu.label)}"
               onerror="this.outerHTML='<span class=\\'logo-missing eu\\'>EU</span>'">
          <span class="eu-label">${esc(eu.label)}</span>
        </div>
      </div>
    </div>
    <p class="eu-disclaimer">${esc(eu.disclaimer)}</p>
  </div>
</footer>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* pages                                                               */
/* ------------------------------------------------------------------ */

function recordPage(rec) {
  const d = 2;
  const meta = '<meta name="robots" content="noindex">\n';

  const card = rec.status === 'revoked' ? `
    <div class="card revoked">
      <span class="badge bad">Revoked</span>
      <h2>This certificate has been revoked</h2>
      <p>A certificate with this ID was issued but is no longer valid. It should not be
         accepted as evidence of completion. Contact the course coordination office for
         details.</p>
      <dl>
        <dt>Certificate ID</dt><dd class="mono">${esc(rec.certificate_id)}</dd>
        ${rec.revoked_on ? `<dt>Revoked on</dt><dd>${esc(rec.revoked_on)}</dd>` : ''}
      </dl>
    </div>` : `
    <div class="card">
      <span class="badge">Verified</span>
      <div class="name">${esc(rec.name)}</div>
      <p class="prog">${esc(P.name)}</p>
      <dl>
        <dt>Certificate ID</dt><dd class="mono">${esc(rec.certificate_id)}</dd>
        <dt>Batch</dt><dd>Batch ${esc(rec.batch)}</dd>
        ${rec.completed ? `<dt>Completed</dt><dd>${esc(rec.completed)}</dd>` : ''}
        <dt>Issued</dt><dd>${esc(rec.issued)}</dd>
      </dl>
      <a class="dl" href="${esc(rec.pdf_link)}" target="_blank" rel="noopener noreferrer">
        Download certificate (PDF)</a>
    </div>`;

  return head(`Certificate ${rec.certificate_id} — ${P.name}`, d, meta) + header('verify', d) + `
<div class="verify-wrap">
  <h1 class="page-title">Certificate record</h1>
  <p class="prog">Published by ${esc(P.host)}.</p>
  ${card}
  <p class="hint foot-note">
    Checking a different certificate? <a href="${prefix(d)}verify/">Look up another ID</a>.
    Questions: <a href="mailto:${esc(P.contactEmail)}">${esc(P.contactEmail)}</a>.
  </p>
</div>` + footer(d);
}

function verifyPage() {
  const d = 1;
  return head(`Verify a Certificate — ${P.name}`, d) + header('verify', d) + `
<div class="verify-wrap">
  <h1 class="page-title">Verify a Certificate</h1>
  <p class="prog">${esc(P.name)}</p>

  <form class="verify" id="f" autocomplete="off">
    <input type="search" id="q" placeholder="RES-B2-0001-HN24"
           aria-label="Certificate ID" spellcheck="false">
    <button class="btn" type="submit">Verify</button>
  </form>
  <p class="hint">
    Enter the certificate ID printed on the certificate, including the four characters after
    the last dash. Scanning the QR code goes straight to the record.
  </p>

  <div id="out" aria-live="polite"></div>

  <p class="hint foot-note">
    Certificates cannot be looked up by name — a record is reachable only by its certificate ID.<br>
    Cannot find a certificate you believe is genuine? Contact
    <a href="mailto:${esc(P.contactEmail)}">${esc(P.contactEmail)}</a>.
  </p>
</div>
<script>
/* The form only navigates. Every record is a real page, so verification
   itself needs no JavaScript — this just avoids a pointless trip to a 404. */
var ID_RE = ${ID_RE.toString()};
document.getElementById('f').addEventListener('submit', function (e) {
  e.preventDefault();
  var out = document.getElementById('out');
  var id = document.getElementById('q').value.trim().toUpperCase();
  out.textContent = '';
  if (!ID_RE.test(id)) {
    out.innerHTML = '<div class="card err"><h2>That does not look like a certificate ID</h2>' +
      '<p>IDs look like <span class="mono">RES-B2-0001-HN24</span>. Check it is copied in ' +
      'full, including the four characters after the last dash.</p></div>';
    return;
  }
  location.href = '../c/' + encodeURIComponent(id) + '/';
});
</script>` + footer(d);
}

function notFoundPage() {
  /* GitHub Pages serves this for any unmatched path, which is where a
     mistyped or unknown certificate ID lands. */
  const d = 0;
  return head('Certificate not found — ' + P.name, d,
    '<meta name="robots" content="noindex">\n') + header('verify', d) + `
<div class="verify-wrap">
  <div class="card err">
    <h2>No certificate matches this ID</h2>
    <p>Nothing is on record at this address.</p>
    <p>Check the ID is copied in full, including the four characters after the last dash.
       IDs look like <span class="mono">RES-B2-0001-HN24</span>.</p>
  </div>
  <p class="hint foot-note">
    <a href="verify/">Try another certificate ID</a> ·
    Contact <a href="mailto:${esc(P.contactEmail)}">${esc(P.contactEmail)}</a>
  </p>
</div>` + footer(d);
}

function templatePage(file, current, depth) {
  let html = fs.readFileSync(path.join(SRC, 'pages', file), 'utf8');
  const map = {
    '{{HEAD}}': head(file === 'index.html' ? P.name : `The Course — ${P.name}`, depth),
    '{{HEADER}}': header(current, depth),
    '{{FOOTER}}': footer(depth),
    '{{PARTNER_LOGOS}}': partnerLogos(depth),
    '{{PREFIX}}': prefix(depth),
    '{{FULL_TITLE}}': esc(P.fullTitle),
    '{{HOST}}': esc(P.host)
  };
  for (const k of Object.keys(map)) html = html.split(k).join(map[k]);

  const left = html.match(/\{\{[A-Z_]+\}\}/g);
  if (left) throw new Error(`${file}: unreplaced tokens ${[...new Set(left)].join(', ')}`);
  return html;
}

/* ------------------------------------------------------------------ */
/* build                                                               */
/* ------------------------------------------------------------------ */

function build() {
  const files = batchFiles();
  if (!files.length) {
    console.error('No participants/batch-*.csv files found. Nothing to build.');
    process.exit(1);
  }

  let all = [], problems = [], assigned = 0;
  for (const f of files) {
    const { records, problems: p } = readBatch(f);
    problems = problems.concat(p);
    if (p.length) continue;
    assigned += assignMissingIds(f, records);
    all = all.concat(records);
  }
  problems = problems.concat(checkRecords(all));

  if (problems.length) {
    console.error('\nBuild stopped. Fix these and run again:\n');
    for (const p of problems) console.error('  * ' + p);
    console.error('');
    process.exit(1);
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  // Stops GitHub Pages running Jekyll over the output.
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  copyDir(path.join(SRC, 'assets'), path.join(OUT, 'assets'));

  write('index.html', templatePage('index.html', 'home', 0));
  write('course/index.html', templatePage('course.html', 'course', 1));
  write('verify/index.html', verifyPage());
  write('404.html', notFoundPage());

  const counts = { issued: 0, revoked: 0, pending: 0 };
  for (const r of all) {
    counts[r.status]++;
    if (r.status === 'pending') continue;      // no page until it is issued
    write(path.join('c', r.certificate_id, 'index.html'), recordPage(r));
  }

  console.log('Site built.\n');
  for (const f of files) {
    const n = all.filter((r) => r._file === f).length;
    console.log(`  ${f.padEnd(14)} ${n} participant${n === 1 ? '' : 's'}`);
  }
  console.log(`\n  ${counts.issued} issued, ${counts.revoked} revoked, ` +
              `${counts.pending} pending (no page yet)`);
  if (assigned) {
    console.log(`\n  ${assigned} new certificate ID${assigned === 1 ? '' : 's'} created ` +
                `and saved back into the CSV.`);
  }

  const missing = [].concat(
    config.partners.map((p) => p.file),
    [config.euFunding.file],
    config.brand && config.brand.logo ? [config.brand.logo] : []
  ).filter((f) => !fs.existsSync(path.join(SRC, 'assets', 'logos', f)));
  if (missing.length) {
    console.log('\n  Note: these logo files are missing, so a text box shows instead:');
    for (const f of missing) console.log('    src/assets/logos/' + f);
  }

  if (config._baseUrl_TODO) {
    console.log('\n  Note: the website address in config.json is still a placeholder.');
    console.log('  It gets printed into every QR code — settle it before printing anything.');
  } else {
    console.log(`\n  QR base:  ${config.baseUrl}/c/<CERTIFICATE_ID>/`);
  }
  console.log('\n  Preview:  npm start   (or double-click preview.bat)\n');
}

build();
