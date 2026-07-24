#!/usr/bin/env node
/* Serves the whole certificate-site/ folder — needed only for the design
   tools in here (certificate-preview.html), which read config.json,
   participants/*.csv and src/assets/ directly, none of which live inside
   docs/. The real site preview is ../serve.js, which mirrors docs/ the
   way GitHub Pages actually serves it — use that one for everything else.

   Plain Node, no dependencies. Run from anywhere: `node tools/serve.js`. */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2]) || 8001;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

http.createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400); res.end('Bad request'); return;
  }

  let file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (rel === '/') file = path.join(ROOT, 'tools', 'certificate-preview.html');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('Not found: ' + rel); return; }

  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  res.end(fs.readFileSync(file));
}).listen(PORT, () => {
  console.log(`\n  Design tools running at http://localhost:${PORT}/`);
  console.log(`  Certificate layout:  http://localhost:${PORT}/tools/certificate-preview.html`);
  console.log('  Press Ctrl+C to stop.\n');
});
