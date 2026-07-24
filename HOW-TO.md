# How to run this site

Written for whoever maintains the certificate list. No programming needed.

## One-time setup

Install **Node.js** from <https://nodejs.org> (take the version marked *LTS*). Also install the
**GitHub CLI** from <https://cli.github.com/>; on Windows, run `winget install GitHub.cli`. In a
project terminal, run `gh auth login` once and choose **GitHub.com → HTTPS → Login with a web
browser**.

## The certificate workflow

### 1. Replace the local dummy roster

`participants/participants.csv` already exists on this computer and is ignored by Git. It contains
three dummy rows, all marked `pending`. Open it in Excel or Google Sheets, replace those rows with
the coordinator's roster, set the correct `batch`, leave `certificate_id` blank, and keep `status`
as `pending`.

This private file must never be added to the public repository. Full column instructions are in
`participants/README.md`.

### 2. Assign IDs and generate QR codes

Run:

```bash
npm run refresh-drafts
```

This is the repeatable command to use after every roster or name change. It runs the ID/QR preparation
and draft PDF generation together. Existing certificate IDs are preserved; only blank IDs receive
new values.

It assigns each blank ID, writes the IDs back into the private CSV, and writes private materials into
`certificate-materials/`:

- `verification-links.csv` lists every certificate ID and verification URL.
- `<certificate ID>.png` is a print-ready QR code.
- `<certificate ID>.svg` is a scalable QR code.

Use the certificate ID, verification URL and QR code in each PDF design.

### 3. Review the draft PDFs

The `refresh-drafts` command already creates a timestamped folder with a watermarked draft PDF for
every private row in `certificate-pdfs/`. These drafts are intentionally retained for layout review
and say **DRAFT — NOT VALID FOR ISSUE**. Open each PDF, scan its QR code and confirm it points to the
matching verification URL. Use the newest timestamped folder after each refresh.

The Batch 2 draft states successful completion for **3 July 2026 to 1 August 2026** and displays
**Batch 2**. When the coordinator approves the wording and signatories, update the `certificate`
section in `config.json`: set `status` to `approved` and replace all `To be confirmed` values. The
final command will refuse to run until that approval information is present.

You will see something like:

```text
Site built.

  participants.csv    14 participants

  12 issued, 1 revoked, 1 pending (no page yet)

  1 new certificate ID created and saved back into the CSV.
```

If something is wrong it stops and tells you exactly which file and line, for example:

```text
Build stopped. Fix these and run again:

  * participants.csv line 5: no name
  * participants.csv line 9: marked issued but has no pdf_link
```

Fix the spreadsheet and run it again. Nothing is published until the build succeeds.

### 4. Finalize PDFs, then upload and mark records issued

After certificate wording and signatories are approved, enter the real issue date for each
non-revoked participant and run:

```bash
npm run generate-certificates
```

Upload each approved PDF to the Google Drive folder. Set sharing to **Anyone with the link —
Viewer**. Copy the Drive `/view` URL into `pdf_link`, then change `status` from `pending` to
`issued`.

### 5. Deploy without copying a secret manually

First commit and push any public source changes in this repository. Then run:

```bash
npm run deploy-roster
```

The command validates the roster, securely replaces the `PARTICIPANTS_CSV` Actions secret, and
triggers the deployment workflow. Monitor the result at:

<https://github.com/risk-e-scape/risk-e-scape.github.io/actions>

### 6. Notify students

After the workflow passes, send each student their PDF link, certificate ID and verification URL.
Students can scan the QR code or enter the ID at the verification page.

## Previewing before deployment

**Windows:** double-click `preview.bat`. **Mac or Linux:** `./preview.sh`.

Then open <http://localhost:8000> in a browser. Press `Ctrl+C` in the black window to stop it.

Check a certificate record page using an issued ID from your private CSV, for example
`http://localhost:8000/c/RES-B2-0001-HN24/`. Pending IDs deliberately have no public page.

## Changing the wording, contacts or partners

Everything else lives in two places:

- **`config.json`** — course name, contact email, address, partner logos, the EU funding
  statement. Open it in a plain text editor. Keep the quotes and commas exactly as they are.
- **`src/pages/index.html`** and **`src/pages/course.html`** — the words on the home page and
  the course page.

Rebuild afterwards.

## Things that must not change

- A certificate ID that has already been printed — the QR code points at it.
- `baseUrl` in `config.json` — encoded into every QR code already printed.
- Anything inside `docs/` — regenerated from scratch every build, so edits there are lost.
