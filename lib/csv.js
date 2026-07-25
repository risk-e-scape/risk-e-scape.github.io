/* Shared CSV handling for the certificate pipeline.

   build.js, prepare-certificates.js and generate-certificates.js all read the
   same participants.csv. They used to carry three separate copies of this
   scanner; the copies happened to agree, but nothing kept them agreeing.

   test.js deliberately does NOT use this module -- see the note there. A test
   that shares the parser it is validating cannot detect a bug in that parser,
   because both sides would be wrong in the same way and the suite would pass.

   Plain Node, no dependencies, in keeping with the rest of the project. */

'use strict';

/* Characters that make a spreadsheet treat a cell as a formula. A name
   beginning with one of these is executable the moment someone opens the CSV
   in Excel or Google Sheets. */
const FORMULA_PREFIXES = ['=', '+', '-', '@'];
const ZERO_WIDTH_SPACE = '\u200B';

/* RFC 4180 compliant CSV parser. Handles quoted fields with embedded
   newlines, escaped quotes (""), and CRLF/LF line endings. Returns rows as
   arrays of strings, with fully blank rows dropped. */
function parseRows(text) {
  const rows = [];
  let row = [], field = '', quoted = false, i = 0;
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

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

/* The same scan, mapped onto objects keyed by the lower-cased header row and
   trimmed. What the certificate scripts want. */
function parseRecords(text) {
  const rows = parseRows(text);
  if (!rows.length) return [];
  const header = rows[0].map((value) => value.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const record = {};
    header.forEach((name, index) => { record[name] = (cells[index] || '').trim(); });
    return record;
  });
}

/* Neutralize CSV formula injection by prefixing dangerous starters with ZWSP.
   Apply this to any participant-supplied value on its way INTO a CSV -- both
   participants.csv and any file derived from it, such as
   certificate-materials/verification-links.csv, which the coordinator is
   instructed to open in a spreadsheet. */
function sanitizeName(name) {
  const s = String(name == null ? '' : name);
  if (FORMULA_PREFIXES.includes(s[0])) return ZERO_WIDTH_SPACE + s;
  return s;
}

function csvField(v) {
  v = v == null ? '' : String(v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

module.exports = {
  FORMULA_PREFIXES, ZERO_WIDTH_SPACE,
  parseRows, parseRecords, sanitizeName, csvField
};
