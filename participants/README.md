# Participant lists

One file per batch. `batch-1.csv` is the first batch, `batch-2.csv` the second, and so on.

Open these in Excel, Google Sheets, or any spreadsheet program. Save as CSV when you are done.

## Adding participants

Add one row per person. **You only need to fill in three things:**

| Column | What to put |
| --- | --- |
| `name` | The name exactly as it should appear on the certificate |
| `completed` | Date they finished, as `2026-08-01` |
| `issued` | Date the certificate is dated, as `2026-08-01` |

**Leave `certificate_id` empty.** The build creates a new ID and saves it back into the file
for you. Do not invent IDs by hand.

Fill in `pdf_link` and `sha256` once the certificate PDF exists — until then, set `status` to
`pending` and the person will not appear on the site.

## Getting one certificate live, start to finish

There is no automatic certificate generator yet. PDFs are designed and uploaded by hand. The
order below matters — the certificate ID has to exist **before** you design the PDF, because
the ID and its QR code get printed on the certificate itself.

1. **Add the row first, ID blank.** Fill in `name`, `completed`, `issued`. Leave
   `certificate_id` empty and set `status` to `pending`.
2. **Run the build once** (`build.bat` / `build.sh`, see `../HOW-TO.md`). It invents a
   certificate ID for the new row and writes it back into the CSV — for example
   `RES-B2-0009-7MXQ`. Open the CSV again to see it.
3. **Design the certificate PDF** using that ID. It needs, printed on the certificate:
   - the participant's name
   - the certificate ID, as text someone can read and type
   - a QR code pointing at `<baseUrl>/c/<the ID>/` — e.g.
     `https://risk-e-scape.github.io/c/RES-B2-0009-7MXQ/` (`baseUrl` is set in `../config.json`)
4. **Export it as a PDF** and upload it to the shared Google Drive folder.
5. **Set sharing to "Anyone with the link — Viewer".** If this step is skipped, the download
   button on the site will fail for everyone except the person who uploaded it. In Drive:
   right-click the file → *Share* → *General access* → *Anyone with the link*.
6. **Copy the share link** and paste it into that row's `pdf_link` column.
7. **Work out the checksum** and paste it into `sha256` — see below.
8. **Change `status` to `issued`** (or just clear it — blank means issued too).
9. **Run the build again.** The record goes live at `<baseUrl>/c/<the ID>/`.

### Working out the checksum

This proves a downloaded PDF has not been altered since it was issued. Run one of these on the
PDF file itself, then paste the long string of letters and numbers it prints into `sha256`.

**Windows** — open Command Prompt in the folder with the PDF and run:

```text
certutil -hashfile "certificate.pdf" SHA256
```

**Mac** — open Terminal and run:

```text
shasum -a 256 certificate.pdf
```

**Linux:**

```text
sha256sum certificate.pdf
```

## All the columns

| Column | Meaning |
| --- | --- |
| `certificate_id` | Leave blank for new people. **Never change an existing one** — it is printed on paper. |
| `name` | As it appears on the certificate |
| `completed` | Date the person finished the course |
| `issued` | Date on the certificate |
| `status` | `issued`, `pending` or `revoked`. Blank means `issued`. |
| `pdf_link` | Google Drive link to the certificate PDF |
| `sha256` | Checksum of the PDF, so anyone can confirm a download was not altered |
| `revoked_on` | Only for revoked certificates: the date it was withdrawn |

## What each status does

- **`issued`** — the record is live on the site and the PDF can be downloaded.
- **`pending`** — no page is created at all. The ID behaves exactly like an unknown one. Use this
  while a certificate is being prepared.
- **`revoked`** — the page still exists and says the certificate has been withdrawn. Use this,
  not deletion: a missing page looks like a typo, a revocation notice does not.

## Adding a new batch

Copy `batch-2.csv`, rename it `batch-3.csv`, delete the rows, and add the new people. The build
picks it up automatically. Nothing else needs changing.

## Then

Run the build (see `../HOW-TO.md`). It checks the files first and tells you in plain language if
anything is wrong.

## ⚠️ Two things to be careful about

**Everything in these files becomes public.** They are published on the internet and stored in
the repository's history — so a name cannot be fully un-published later. Never add email
addresses, phone numbers, addresses, ID numbers, grades or marks. The build refuses to run if it
finds those columns.

**Never change or reuse a `certificate_id` that has already been printed.** The QR code on the
paper certificate points at it. Changing it breaks every printed copy.
