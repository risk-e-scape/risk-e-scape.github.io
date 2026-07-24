# Risk-E-Scape Certificate Verification

Certificate issuing and verification for the DU Risk-E-Scape Certificate Course.
Batch 1 and Batch 2 are certified together at the close of Batch 2.

A static site. `build.js` turns the per-batch CSVs in `participants/` plus `config.json` and
`src/` into `docs/`, which GitHub Pages serves. **Certificate PDFs are not stored here** — they
live in Google Drive, and each record links to its Drive file.

**Maintaining the participant lists needs no programming — see [HOW-TO.md](HOW-TO.md).**

## How verification works

Each certificate carries a unique ID (`RES-B2-0001-HN24`) and a QR code. Both point at one page:

```text
<baseUrl>/c/RES-B2-0001-HN24/
```

That page is a real, static HTML file — no JavaScript, no backend, nothing to go down. It shows
the name, batch, dates, modules, a link to the PDF in Drive, and the PDF's SHA-256.

A downloadable PDF proves nothing on its own; anyone can edit a name in a PDF. Trust comes from
the record we publish, plus the checksum for the file it points to.

**No name search, no participant list.** A record is reachable only by its certificate ID.

## Layout

```text
participants/   batch-1.csv, batch-2.csv, ... — the participant lists
config.json     course name, contacts, partner logos, EU funding, baseUrl
build.js        generates docs/
serve.js        local preview server
test.js         checks the built output
build.bat/.sh   double-click build
preview.bat/.sh double-click preview
src/
  pages/        index.html, course.html — templates with {{TOKENS}}
  assets/       site.css and logos
docs/           GENERATED. Never edit by hand; overwritten every build.
tools/          certificate layout mock, not part of the published site
```

## Build and test

```bash
node build.js          # writes docs/
node test.js --build   # build, then check the output (28 checks)
node serve.js          # preview at http://localhost:8000
```

Or double-click `build.bat` / `preview.bat` on Windows, `build.sh` / `preview.sh` elsewhere.

Worth checking by hand at <http://localhost:8000/>:

| URL | Expected |
| --- | --- |
| `/c/RES-B2-0001-HN24/` | a sample issued record |
| `/c/RES-B1-0006-ZW68/` | revoked notice, no PDF link |
| `/c/RES-B2-0007-TQ81/` | 404 — pending records get no page |
| `/c/RES-B2-0006-WX02/` | injected `<script>` renders as visible text |
| `/c/RES-B2-0008-FUAZ/` | ID that the build generated from a blank cell |
| `/verify/` | ID entry form; a malformed ID is rejected before navigating |

## The permanent home

`baseUrl` in `config.json` is encoded into every QR code. Changing it after certificates are
printed means reprinting them.

**Locked in:** `https://risk-e-scape.github.io`, via the `risk-e-scape` GitHub organisation.

```text
https://risk-e-scape.github.io/c/RES-B2-0001-HN24/
```

### One remaining step: the repo name

The org's repo must be renamed to **exactly** `risk-e-scape.github.io` — that specific name is
what makes GitHub Pages serve from the domain root. Any other name (including the org's own name,
`risk-e-scape`) gets served at a sub-path instead:
`https://risk-e-scape.github.io/risk-e-scape/...`. GitHub → repo → Settings → repository name.

Confirm the rename actually took by checking that the site loads at the root URL above, with
nothing after `.io`, before generating a single QR code.

### Contact email

Should also be a role account, not personal — `riskescape@du.ac.bd` if the department can create
it. That is set separately in `config.json` under `programme.contactEmail`; it currently reads
`devstudies@du.ac.bd`, which is institutional and fine as a placeholder in the meantime. A free
mailbox (`@gmail.com` etc.) is the fallback if neither is available — weaker on a credential,
since anyone can register a lookalike, so treat it as temporary and hold the password with the
coordination office rather than one person.

### Publishing

Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/docs`.
`docs/.nojekyll` is generated so Pages serves the files as-is.

### The fallback that makes any of this survivable

Whatever address is chosen, the certificate prints the **ID and the verification URL as readable
text** next to the QR code. If the URL ever dies, a human can still read the ID and look it up
wherever the site lives by then. That text block is not decoration — do not let it be designed
out.

## ⚠️ Everything in participants/*.csv is public

The CSVs are committed to a public repo and built into the site. Git history keeps it even
after deletion, so removing a participant later means rewriting history.

- Never add a field the certificate does not itself carry. `build.js` refuses to build if it finds
  `email`, `phone`, `address`, `nid`, `grade`, `marks` or `dob`.
- **Participants should be told their name will be published this way**, before certificates are
  generated. This is a consent question, not a technical one.
- Choosing not to publish a participant list is now a UX decision, not a privacy control — the data
  is in the repo either way and can be cloned.

## Certificate IDs

Format `RES-B<batch>-<sequence>-<4 random chars>`, e.g. `RES-B2-0001-HN24`.

The random suffix is not decoration: without it IDs are sequential and anyone can walk
`RES-B2-0001 … 9999` to enumerate every record page.

## Open prerequisites

These block printing, and none of them are code.

- [ ] **Permanent `baseUrl`** — see above.
- [ ] **Batch 1 roster reconciliation** — does a clean list of names and completions exist?
- [ ] **Eligibility rule** — what earns a certificate (attendance, assignments, both)? `status` is
      meaningless until this is written down.
- [ ] **Name confirmation loop** — participants approve their own spelling before generation. The
      alternative is reprinting.
- [ ] **Consent** — participants told their name goes into a public repo.
- [ ] **Certificate sign-off** — logos, signatories, credit hours, wording approved by DU and the
      consortium.
- [ ] **Confirm the partner list** — two entries were misread from the banner photo. See
      `src/assets/logos/README.md`.
- [ ] **EU disclaimer wording** — check `euFunding.disclaimer` against the grant agreement.

## Still to build

- PDF generation from a Slides template (Sheets + Apps Script), writing `pdf_link` and `sha256`
  back into the CSVs.
- QR generation pointing at `<baseUrl>/c/<CERT_ID>/`.
- Participant notification — mail merge telling each person their ID and link.
