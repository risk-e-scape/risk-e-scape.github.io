# Risk-E-Scape Certificate Verification

Certificate issuing and verification for the DU Risk-E-Scape Certificate Course. Batch 1 and
Batch 2 are certified together at the close of Batch 2.

Live at **<https://risk-e-scape.github.io/>**.

**Maintaining the participant lists needs no programming — see [HOW-TO.md](HOW-TO.md).**

## How it works

A static site. `build.js` turns `participants/participants.csv`, plus `config.json` and
`src/`, into `docs/`, which GitHub Pages serves. Certificate PDFs live in Google Drive, not in
this repo — each record just links to its Drive file.

Every certificate carries a unique ID and a QR code, both pointing at one page:

```text
https://risk-e-scape.github.io/c/RES-B2-0001-HN24/
```

That page is a plain HTML file — no JavaScript, no backend. A downloadable PDF alone proves
nothing; anyone can edit a name in one. Trust comes from the record published here.

There is no name search and no participant list page — a record is reachable only by its
certificate ID.

## Layout

```text
participants/   participants.csv — the participant list
config.json     course name, contacts, partner logos, EU funding, baseUrl
build.js        generates docs/
serve.js        local preview server
test.js         checks the built output
build.bat/.sh   double-click build
preview.bat/.sh double-click preview
src/
  pages/        index.html, course.html — templates
  assets/       site.css and logos
docs/           GENERATED — never edit by hand
```

## Build and test

```bash
node build.js          # writes docs/
node test.js --build   # build, then check the output
node serve.js          # preview at http://localhost:8000
```

Or double-click `build.bat` / `preview.bat` on Windows, `build.sh` / `preview.sh` elsewhere.

Publishing: Settings → Pages → *Deploy from a branch*, branch `main`, folder `/docs`.

## Certificate IDs

Format `RES-B<batch>-<sequence>-<4 random chars>`, e.g. `RES-B2-0001-HN24`. The random suffix
matters — without it, IDs are sequential and the whole list could be walked.

`baseUrl` in `config.json` gets encoded into every QR code. Changing it after certificates are
printed means reprinting them. The certificate also prints the ID and the site address as plain
text next to the QR, so a record can still be found even if a QR code fails to scan.

## Everything in participants/participants.csv is public

Committed to a public repo, built into the site, and kept in git history even after a row is
deleted.

- Never add a field the certificate doesn't itself carry — `build.js` refuses to build if it
  finds `email`, `phone`, `address`, `nid`, `grade`, `marks` or `dob`.
- Participants should be told their name will be published this way, before certificates are
  generated.

## License

MIT &copy; 2026 Md Mohsin Hossain. See [LICENSE](LICENSE).

## Still open

- Batch 1 roster reconciliation — does a clean list of names and completions exist?
- Eligibility rule — what earns a certificate (attendance, assignments, both)?
- Name confirmation — participants approve their own spelling before generation.
- Certificate sign-off — signatories, wording, approved by DU and the consortium.
- `programme.contactEmail` is currently a free Gmail address, not an institutional one —
  swap for `riskescape@du.ac.bd` if the department can create it (one `config.json` edit).
- `euFunding.disclaimer` in `config.json` — check the wording against the actual grant agreement.

## Still to build

- PDF generation from a template, writing `pdf_link` back into the CSVs.
- QR code generation pointing at `<baseUrl>/c/<CERTIFICATE_ID>/`.
- Participant notification — telling each person their ID and link.
