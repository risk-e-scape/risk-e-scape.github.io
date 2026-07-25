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
const PARTICIPANTS_CSV = path.join(PEOPLE, 'participants.csv');

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
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
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
    const idMatch = /^RES-B(\d+)-\d{4}-[A-Z0-9]{4}$/.exec(o.certificate_id || '');
    o._batch = idMatch ? parseInt(idMatch[1], 10) : null;
    return o;
  });
}

const records = fs.existsSync(PARTICIPANTS_CSV) ? readCsv(PARTICIPANTS_CSV) : [];

let pass = 0, fail = 0;
const skipped = [];
const warnings = [];
function check(label, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { pass++; return; }
  fail++;
  console.log('FAIL  ' + label +
    '\n  expected ' + JSON.stringify(expected) +
    '\n  actual   ' + JSON.stringify(actual));
}

/* A check with nothing to run against -- no issued record to inspect, no
   revoked one, no name carrying the character being escaped. Recorded and
   printed at the end rather than dropped on the floor: "0 failed" must never
   be readable as "everything was verified" when a third of the suite never
   executed. */
function skip(label, reason) { skipped.push({ label, reason }); }

/* [].every() is true, so a check phrased over "all issued records" passes
   without asserting anything while nothing is issued. Route those through
   here so an empty set is reported as skipped rather than as a pass. */
function checkEvery(label, list, predicate, reason) {
  if (!list.length) { skip(label, reason); return; }
  check(label, list.every(predicate), true);
}

const recordPage = (id) => {
  const p = path.join(OUT, 'c', id, 'index.html');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
};
const readOut = (rel) => {
  const p = path.join(OUT, rel);
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
const htmlPages = allFiles(OUT).filter((f) => f.endsWith('.html'))
  .map((file) => ({
    file: path.relative(OUT, file).split(path.sep).join('/'),
    html: fs.readFileSync(file, 'utf8')
  }));
const allHtml = htmlPages.map((page) => page.html);

function openingTagWithId(html, tagName, id) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*\\bid=["']${id}["'][^>]*>`, 'i'))?.[0] || '';
}

function hasSkipLink(html) {
  return [...html.matchAll(/<a\b[^>]*>/gi)].some((match) => {
    const tag = match[0];
    const target = /\bhref=["']#([^"']+)["']/i.exec(tag)?.[1];
    return /\bclass=["'][^"']*\bskip(?:-link)?\b[^"']*["']/i.test(tag) &&
      target && new RegExp(`\\bid=["']${target}["']`, 'i').test(html);
  });
}

function pngDimensions(file) {
  if (!fs.existsSync(file)) return null;
  const data = fs.readFileSync(file);
  const signature = '89504e470d0a1a0a';
  if (data.length < 24 || data.subarray(0, 8).toString('hex') !== signature ||
      data.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

/* --- what gets published -------------------------------------------- */

checkEvery('a page exists for every issued record', byStatus('issued'),
  (r) => recordPage(r.certificate_id) !== null, 'no issued records');
checkEvery('a page exists for every revoked record', byStatus('revoked'),
  (r) => recordPage(r.certificate_id) !== null, 'no revoked records');
checkEvery('NO page exists for a pending record', byStatus('pending'),
  (r) => recordPage(r.certificate_id) === null, 'no pending records');
check('core pages built',
  ['index.html', 'course/index.html', 'privacy/index.html', 'verify/index.html', '404.html', '.nojekyll']
    .every((f) => fs.existsSync(path.join(OUT, f))), true);

/* --- certificate IDs -------------------------------------------------- */

check('every row has an ID',
  records.every((r) => /^RES-B\d+-\d{4}-[A-Z0-9]{4}$/.test(r.certificate_id)), true);
check('IDs are unique across all batches',
  new Set(records.map((r) => r.certificate_id)).size, records.length);
check('ID batch number matches the file it is in',
  records.every((r) => r.certificate_id.startsWith('RES-B' + r._batch + '-')), true);

/* --- production data hygiene ----------------------------------------- */

/* "replace" and "participant name" are here because they are the markers this
   project actually uses for template rows -- the roster shipped with
   "Amina Rahman (replace)" and the old example row said "Participant name",
   and neither tripped the original pattern. A guard against placeholder data
   is worthless if it does not know the placeholders in use. */
const placeholderName =
  /\b(?:test|testing|demo|sample|dummy|placeholder|example|fake|replace|participant name)\b/i;
/* A placeholder name only does damage once it publishes. A `pending` row
   generates no page at all, so template rows are expected while a roster is
   being prepared -- warn about those. A placeholder on an issued or revoked
   row is genuine dummy data on the live site, and fails. */
const placeholders = records.filter((r) => placeholderName.test(r.name));
check('no placeholder name on a published (issued or revoked) record',
  placeholders.filter((r) => r.status !== 'pending').map((r) => r.certificate_id), []);
if (placeholders.length) {
  warnings.push(`${placeholders.length} pending row${placeholders.length === 1 ? '' : 's'} ` +
    'still carry placeholder names — replace before issuing: ' +
    placeholders.map((r) => r.certificate_id).join(', '));
}
check('production CSV contains no script tags',
  records.filter((r) => Object.values(r).some((value) => /<\/?script\b/i.test(String(value))))
    .map((r) => r.certificate_id), []);
check('production CSV contains no DUMMY_FILE_ID placeholders',
  records.filter((r) => Object.values(r).some((value) => /DUMMY_FILE_ID/i.test(String(value))))
    .map((r) => r.certificate_id), []);
const today = new Date().toISOString().slice(0, 10);
check('issued dates are not in the future',
  records.filter((r) => r.issued && /^\d{4}-\d{2}-\d{2}$/.test(r.issued) && r.issued > today)
    .map((r) => r.certificate_id), []);

/* --- escaping --------------------------------------------------------- */

const namedPages = byStatus('issued');
const escapingReason = namedPages.length
  ? 'no issued name contains this character'
  : 'no issued records';

const xss = namedPages.find((r) => r.name.includes('<script>'));
if (xss) {
  check('injected markup is escaped, not emitted',
    recordPage(xss.certificate_id).includes('<script>alert('), false);
  check('injected markup survives as visible text',
    recordPage(xss.certificate_id).includes('&lt;script&gt;'), true);
} else {
  skip('injected markup is escaped, not emitted', escapingReason);
  skip('injected markup survives as visible text', escapingReason);
}

const apostrophe = namedPages.find((r) => r.name.includes("O'Sullivan"));
if (apostrophe) {
  check('apostrophe in a name is escaped',
    recordPage(apostrophe.certificate_id).includes('O&#39;Sullivan'), true);
} else {
  skip('apostrophe in a name is escaped', escapingReason);
}

const bangla = namedPages.find((r) => /[ঀ-৿]/.test(r.name));
if (bangla) {
  check('Bangla-script name is emitted intact',
    recordPage(bangla.certificate_id).includes(bangla.name), true);
} else {
  skip('Bangla-script name is emitted intact', escapingReason);
}

const comma = namedPages.find((r) => r.name.includes(','));
if (comma) {
  check('a name containing a comma survives the CSV round trip',
    recordPage(comma.certificate_id).includes(comma.name), true);
} else {
  skip('a name containing a comma survives the CSV round trip', escapingReason);
}

/* --- revoked ---------------------------------------------------------- */

const revoked = byStatus('revoked')[0];
if (revoked) {
  const revPage = recordPage(revoked.certificate_id);
  check('revoked page says so', revPage.includes('has been revoked'), true);
  check('revoked page offers no PDF link', revPage.includes('class="dl"'), false);
  check('revoked page shows no Drive URL', revPage.includes('drive.google.com'), false);
} else {
  for (const label of ['revoked page says so', 'revoked page offers no PDF link',
                       'revoked page shows no Drive URL']) {
    skip(label, 'no revoked records');
  }
}

/* --- data hygiene ------------------------------------------------------ */

const forbidden = ['email', 'phone', 'address', 'nid', 'grade', 'marks', 'dob'];
check('participant files carry no fields beyond the certificate',
  records.some((r) => forbidden.some((k) => r[k])), false);
/* The official contact address is meant to appear on every page — it's the
   configured one, not a leak. Strip it out first, then check what's left. */
const officialEmail = config.programme.contactEmail;
const officialEmailDomain = officialEmail.split('@')[1]?.toLowerCase() || '';
check('no OTHER free-mailbox address leaks in besides the official contact one',
  allHtml.some((h) => {
    const stripped = h.split(officialEmail).join('');
    // Check for free email domains OTHER than the official one's domain
    const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
      .filter(d => d !== officialEmailDomain);
    if (freeDomains.length === 0) return false;
    const pattern = new RegExp(`@(${freeDomains.join('|')})`, 'i');
    return pattern.test(stripped);
  }), false);
check('no PDF committed to the site',
  allFiles(OUT).some((f) => f.endsWith('.pdf')), false);
checkEvery('every issued record links to Drive, not a local file', byStatus('issued'),
  (r) => r.pdf_link.startsWith('https://drive.google.com/'), 'no issued records');
check('no participant name appears on the home page',
  records.some((r) => fs.readFileSync(path.join(OUT, 'index.html'), 'utf8').includes(r.name)),
  false);

/* --- record page contents ---------------------------------------------- */

const sample = byStatus('issued')[0];
const sp = sample ? recordPage(sample.certificate_id) : null;
if (sample) {
  check('record page shows the certificate ID', sp.includes(sample.certificate_id), true);
  check('record page is noindex', sp.includes('name="robots" content="noindex"'), true);
  check('record page links the PDF', sp.includes(sample.pdf_link), true);
} else {
  for (const label of ['record page shows the certificate ID', 'record page is noindex',
                       'record page links the PDF']) {
    skip(label, 'no issued records');
  }
}

/* --- assets and footer -------------------------------------------------- */

const logoDir = path.join(OUT, 'assets', 'logos');
check('every partner logo referenced is present',
  config.partners.filter((p) => !fs.existsSync(path.join(logoDir, p.file))).map((p) => p.file),
  []);
check('EU emblem present', fs.existsSync(path.join(logoDir, config.euFunding.file)), true);
check('EU disclaimer on every page',
  allHtml.every((h) => h.includes('Funded by the European Union')), true);

/* --- meta / SEO / sharing ------------------------------------------------ */

check('favicon files exist',
  ['favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png']
    .every((f) => fs.existsSync(path.join(OUT, 'assets', f))), true);
const ogImagePath = path.join(logoDir, config.brand.banner);
check('OG share image exists', fs.existsSync(ogImagePath), true);
const ogDimensions = pngDimensions(ogImagePath);
check('OG share image is a valid PNG with useful basic dimensions',
  Boolean(ogDimensions && ogDimensions.width >= 600 && ogDimensions.height >= 315), true);
check('every page has a referrer policy',
  allHtml.every((h) => h.includes('name="referrer" content="strict-origin-when-cross-origin"')), true);
check('every page has a restrictive content security policy',
  allHtml.every((h) => h.includes('http-equiv="Content-Security-Policy"')), true);
check('every page has a meta description',
  allHtml.every((h) => /<meta name="description" content="[^"]+"/.test(h)), true);
check('every page has an Open Graph image tag',
  allHtml.every((h) => h.includes('property="og:image"')), true);
check('home page has a canonical link matching baseUrl root',
  readOut('index.html').includes(`<link rel="canonical" href="${config.baseUrl}/">`), true);
if (sample) {
  check('record page has a canonical link matching its own ID',
    sp.includes(`<link rel="canonical" href="${config.baseUrl}/c/${sample.certificate_id}/">`), true);
} else {
  skip('record page has a canonical link matching its own ID', 'no issued records');
}
check('404 page has NO canonical link (it is not a real address)',
  readOut('404.html').includes('rel="canonical"'), false);

/* GitHub Pages serves 404.html's bytes for any unmatched URL while
   leaving the mistyped address in the browser's location bar. A relative
   href/src there resolves against THAT url, not the site root, and
   silently 404s -- most visibly the stylesheet, which makes the whole
   page render unstyled with no visible error. Every href/src in this one
   file must be root-absolute, mailto:, or a full http(s) URL. */
{
  const notFoundHtml = readOut('404.html');
  const relative = [...notFoundHtml.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((v) => !/^(\/|#|mailto:|https?:)/.test(v));
  check('404 page has zero relative asset/link paths', relative, []);

  const genericError = openingTagWithId(notFoundHtml, 'div', 'generic-err');
  const certificateError = openingTagWithId(notFoundHtml, 'div', 'cert-err');
  check('generic 404 message is visible by default',
    Boolean(genericError) && !/\bhidden\b|display\s*:\s*none/i.test(genericError), true);
  check('certificate-specific 404 message is hidden by default',
    Boolean(certificateError) && /\bhidden\b|display\s*:\s*none/i.test(certificateError), true);
}

/* --- static accessibility and document structure --------------------- */

check('every generated page has a main landmark',
  htmlPages.filter((page) => !/<main\b/i.test(page.html)).map((page) => page.file), []);
check('every generated page has a working skip link',
  htmlPages.filter((page) => !hasSkipLink(page.html)).map((page) => page.file), []);
check('every generated page has exactly one h1',
  htmlPages.filter((page) => (page.html.match(/<h1\b/gi) || []).length !== 1)
    .map((page) => page.file), []);
check('no generated page emits a script after </html>',
  htmlPages.filter((page) => {
    const end = page.html.toLowerCase().lastIndexOf('</html>');
    return end !== -1 && /<script\b/i.test(page.html.slice(end + 7));
  }).map((page) => page.file), []);
check('every inline script has valid JavaScript syntax',
  htmlPages.flatMap((page) => [...page.html.matchAll(/<script>([\s\S]*?)<\/script>/gi)]
    .filter((match) => {
      try { new Function(match[1]); return false; } catch { return true; }
    }).map(() => page.file)), []);
check('every generated document declares English as its language',
  htmlPages.filter((page) => !/<html\b[^>]*\blang=["']en["']/i.test(page.html))
    .map((page) => page.file), []);
if (bangla) {
  const banglaPage = recordPage(bangla.certificate_id);
  check('Bangla certificate name is localized in a lang="bn" span',
    /<span\b[^>]*\blang=["']bn["'][^>]*>[^<]*[ঀ-৿][^<]*<\/span>/i.test(banglaPage), true);
} else {
  skip('Bangla certificate name is localized in a lang="bn" span', escapingReason);
}

{
  const verifyHtml = readOut('verify/index.html');
  const searchInput = openingTagWithId(verifyHtml, 'input', 'q');
  const describedBy = /\baria-describedby=["']([^"']+)["']/i.exec(searchInput)?.[1]
    .split(/\s+/).filter(Boolean) || [];
  check('certificate input has a visible associated label',
    /<label\b[^>]*\bfor=["']q["'][^>]*>\s*[^<\s]/i.test(verifyHtml), true);
  check('certificate input describes its instructions with aria-describedby',
    describedBy.length > 0 && describedBy.every((id) =>
      new RegExp(`\\bid=["']${id}["']`, 'i').test(verifyHtml)), true);
}

check('no public _headers artifact is generated', fs.existsSync(path.join(OUT, '_headers')), false);

check('robots.txt exists and points at the sitemap',
  (readOut('robots.txt') || '').includes(`Sitemap: ${config.baseUrl}/sitemap.xml`), true);

const sitemap = readOut('sitemap.xml') || '';
check('sitemap.xml exists and lists the public pages',
  ['<loc>' + config.baseUrl + '/</loc>',
   '<loc>' + config.baseUrl + '/course/</loc>',
   '<loc>' + config.baseUrl + '/privacy/</loc>',
   '<loc>' + config.baseUrl + '/verify/</loc>']
    .every((u) => sitemap.includes(u)), true);
check('sitemap.xml contains NO certificate IDs -- that would rebuild the public roster',
  records.some((r) => sitemap.includes(r.certificate_id)), false);

/* --- the frozen URL ------------------------------------------------------ */

check('placeholder flag has been cleared (baseUrl is locked in)',
  '_baseUrl_TODO' in config, false);
check('baseUrl is the risk-e-scape.github.io root, no repo sub-path',
  config.baseUrl, 'https://risk-e-scape.github.io');

if (warnings.length) {
  console.log('\nWarnings — not failures, but do not ship like this:\n');
  for (const w of warnings) console.log('  ! ' + w);
}

if (skipped.length) {
  console.log('\nSkipped — nothing in the roster exercises these yet:\n');
  for (const s of skipped) console.log('  - ' + s.label + '  (' + s.reason + ')');
  console.log('\n  These cover record pages, name escaping and revocation. They start');
  console.log('  running once the roster has an issued and a revoked record.');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed' +
  (skipped.length ? ', ' + skipped.length + ' skipped' : ''));
process.exit(fail ? 1 : 0);
