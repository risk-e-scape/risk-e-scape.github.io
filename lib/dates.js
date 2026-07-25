/* Shared date formatting.

   build.js and generate-certificates.js both had a function called
   formatDate, and the two disagreed on what an invalid date means: one
   returned the input unchanged, the other returned "To be confirmed". Same
   name, different contract, which is how the next bug gets written.

   The fallback is now an explicit argument, so each caller states its own
   intent at the call site. */

'use strict';

/* Renders an ISO YYYY-MM-DD date as e.g. "1 August 2026".

   Fixed to en-GB and UTC on purpose: the output is printed onto certificates
   and published on record pages, so it must not shift with the locale or
   timezone of whichever machine happens to run the build.

   Anything that is not a well-formed YYYY-MM-DD returns `fallback`. */
function formatDate(isoDate, fallback) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate || '');
  if (!parts) return fallback;
  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(date);
}

module.exports = { formatDate };
