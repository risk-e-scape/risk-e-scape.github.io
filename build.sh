#!/bin/sh
# Rebuilds the site.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo
  echo 'Node.js is not installed.'
  echo 'Install it from https://nodejs.org (choose the LTS version), then run this again.'
  echo
  exit 1
fi
node build.js
