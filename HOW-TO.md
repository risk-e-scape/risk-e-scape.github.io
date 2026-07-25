# How to run this site

Written for whoever maintains the certificate list. No programming needed.

## Where things stand

The site is live at <https://risk-e-scape.github.io/> and deploys automatically on every push to
`main`. The roster currently holds **three placeholder rows marked `(replace)`, all `pending`**, so
**no certificate records are published yet** — that is expected, not a fault. A `pending` row
deliberately produces no page.

Getting from here to real, verifiable certificates is the sequence under
[Issuing certificates](#issuing-certificates) below.

## One-time setup

Install **Node.js** from <https://nodejs.org> (take the version marked *LTS*). That is all — the
roster lives in this repository, so deploying is an ordinary `git push`.

### Windows: two things that will trip you up

**Always work from the site folder, not the course folder.** They are two separate repositories:

```powershell
cd E:\Github\RISK-E-SCAPE-Certificate-Course\risk-e-scape.github.io
```

Running `npm` in the parent folder fails with `Could not read package.json`.

**If PowerShell refuses to run npm** with *"npm.ps1 cannot be loaded because running scripts is
disabled on this system"*, use the `.cmd` shim instead — this changes nothing on your machine:

```powershell
npm.cmd run drafts
```

To fix it permanently for your account instead, run this once. It allows scripts you wrote locally
and requires anything downloaded to be signed:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## The five commands

| Command | What it does |
| --- | --- |
| `npm run drafts` | Assigns missing IDs, writes QR codes, builds **watermarked draft** PDFs. Safe to re-run. |
| `npm run certificates` | Builds the **final, issuable** PDFs. Locked until sign-off (see below). |
| `npm test` | Builds the site and validates everything. Run before every push. |
| `npm start` | Preview at <http://localhost:8000>. `Ctrl+C` to stop. |
| `npm run build` | Builds `docs/` only. `npm test` already does this. |

`npm run drafts` is the one you repeat after every roster or wording change. Existing certificate
IDs are never altered — only blank ones get filled in.

## Issuing certificates

### Step 1 — Put the real roster in

Open `participants/participants.csv` in Excel or Google Sheets. Replace the three `(replace)`
placeholder rows with the coordinator's list. For each person: set `batch`, type the `name` exactly
as it should print, **leave `certificate_id` blank**, and set `status` to `pending`. Leave `issued`
and `pdf_link` empty for now. A `pending` row publishes nothing at all — see
[Record statuses](README.md#record-statuses) for what each status does.

Save as CSV. Column details are in `participants/README.md`.

> **This file is public.** Everyone listed appears in the published repository, not only on their own
> record page. Obtain each participant's agreement first. Never add a column the certificate does not
> print — the build refuses to run if it finds email, phone, address, ID numbers, grades, marks or
> dates of birth.

### Step 2 — Assign IDs and generate drafts

```bash
npm run drafts
```

This writes a new ID into each blank row and saves the file, then produces:

- `certificate-materials/verification-links.csv` — every ID with its verification URL
- `certificate-materials/<ID>.png` — print-ready QR code
- `certificate-materials/<ID>.svg` — scalable QR code
- `certificate-pdfs/draft-<timestamp>/<ID>.pdf` — one watermarked draft per row

These folders stay on your computer and are ignored by Git.

If a row is wrong, the build stops and names the line:

```text
Build stopped. Fix these and run again:

  * participants.csv line 5: no name
  * participants.csv line 9: marked issued but has no pdf_link
```

Fix the spreadsheet and run again. Nothing is published until the build succeeds.

### Step 3 — Review the drafts with the coordinator

Open the newest folder under `certificate-pdfs/`. Every file is stamped
**DRAFT — NOT VALID FOR ISSUE**. Check each one for:

- the name spelled and rendered correctly (Bangla names use a Bengali font)
- the certificate ID and the printed verification URL
- the course period and batch
- signature space and print margins
- **scan the QR code** — it must open that person's verification URL

The layout, fonts and QR are produced by exactly the same code as the final PDF. Only three things
differ, so a draft is a faithful preview:

| | Draft | Final |
| --- | --- | --- |
| Watermark | `DRAFT — NOT VALID FOR ISSUE` | none |
| Signatures | `Signatory to be confirmed` | the real names from `config.json` |
| Issue date | `To be confirmed` | the real date from the CSV |

Repeat steps 1–3 until the coordinator is satisfied. Re-running `npm run drafts` is free and never
changes an ID that already exists.

### Step 4 — Record the approval in `config.json`

`npm run certificates` stays locked until sign-off is recorded. In `config.json`, edit the
`certificate` block:

```json
"certificate": {
  "status": "approved",
  "completionStatement": "for successful completion of the course conducted",
  "signatories": [
    { "name": "Real Name Here", "role": "Course coordination" },
    { "name": "Real Name Here", "role": "Authorised institutional signatory" }
  ]
}
```

Both changes are required: `status` must become `approved`, and **no field may still read
"To be confirmed"**. Until then you get:

```text
Final certificate generation is locked until the coordinator confirms:
certificate.status must be "approved", approved certificate.signatories
```

That message is the safeguard working — it exists so a draft can never be mistaken for an issuable
certificate.

### Step 5 — Add issue dates, then build the final PDFs

In the CSV, fill `issued` for every person, as `YYYY-MM-DD` (for example `2026-08-01`). Then:

```bash
npm run certificates
```

Missing a date stops the run and lists exactly which IDs need one. The finals land **directly in
`certificate-pdfs/`**, not in a timestamped subfolder — so re-running replaces the previous set.
Print or upload from that folder.

### Step 6 — Upload to Google Drive

Upload each final PDF to the shared Drive folder. For each file set sharing to
**Anyone with the link — Viewer**. Without that, the verification link only works for whoever
uploaded it.

Copy each file's `/view` URL into the matching row's `pdf_link`, then change that row's `status`
from `pending` to `issued`.

The link must be a genuine Drive viewer URL of the form
`https://drive.google.com/file/d/<file id>/view`. The build rejects anything else, and rejects
placeholder text, so this step cannot be faked ahead of time.

### Step 7 — Publish

```bash
npm test
git add -A
git commit -m "Issue Batch 2 certificates"
git push
```

Pushing to `main` builds and publishes the site. Watch it at
<https://github.com/risk-e-scape/risk-e-scape.github.io/actions>.

Each `issued` row now has a live record at `https://risk-e-scape.github.io/c/<ID>/`.

> **Assign IDs before you push.** The build refuses to invent an ID on the GitHub runner, because
> the runner is discarded afterwards and the next build would produce a different ID — moving a
> record that may already be printed on paper. `npm run drafts` assigns them locally; just commit
> the CSV it writes.

### Step 8 — Notify participants

Send each person their certificate ID, verification URL and PDF link through the approved
institutional channel. They can scan the QR code or type the ID at
<https://risk-e-scape.github.io/verify/>.

## Previewing before deployment

**Windows:** double-click `preview.bat`. **Mac or Linux:** `./preview.sh`. Or run `npm start`.

Then open <http://localhost:8000>. Press `Ctrl+C` in the black window to stop it.

To check a record page, use an `issued` ID from the CSV, for example
`http://localhost:8000/c/RES-B2-0001-94SX/`. Pending IDs deliberately have no page and return the
"not found" screen.

## Changing the wording, contacts or partners

- **`config.json`** — course name, contact email, address, partner logos, EU funding statement.
  Open it in a plain text editor and keep the quotes and commas exactly as they are.
- **`src/pages/index.html`**, **`course.html`**, **`privacy.html`** — the words on those pages.

Run `npm test` afterwards, then commit and push.

## Things that must not change

- **A certificate ID that has already been printed** — its QR code points at that exact URL.
- **`baseUrl` in `config.json`** — it is encoded into every QR code already printed. Changing it
  after certificates are printed means reprinting them.
- **Anything inside `docs/`** — regenerated from scratch on every build, so edits there are lost.
