#!/usr/bin/env node
/* Previews the built site at http://localhost:8000.
   Plain Node, no dependencies, no Python — if the build runs, this runs.

   Local preview only. GitHub Pages serves the real site. */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, 'docs');
const PORT = Number(process.argv[2]) || 8000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

if (!fs.existsSync(ROOT)) {
  console.error('\n  docs/ does not exist yet. Run the build first.\n');
  process.exit(1);
}

http.createServer((req, res) => {
  let rel;
  try {
    rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400); res.end('Bad request'); return;
  }

  // Resolve the requested path and ensure it's within ROOT
  const requestedPath = path.resolve(ROOT, rel);
  if (!requestedPath.startsWith(ROOT + path.sep) && requestedPath !== ROOT) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  let file = requestedPath;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }

  if (!fs.existsSync(file)) {
    // Same as GitHub Pages: unknown paths get 404.html, which is how a
    // mistyped certificate ID lands somewhere useful.
    const notFound = path.join(ROOT, '404.html');
    if (fs.existsSync(notFound)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      res.end(fs.readFileSync(notFound));
    } else {
      res.writeHead(404); res.end('Not found');
    }
    return;
  }

  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  res.end(fs.readFileSync(file));
}).listen(PORT, () => {
  console.log(`\n  Preview running at http://localhost:${PORT}`);
  console.log('  Press Ctrl+C to stop.\n');
});
