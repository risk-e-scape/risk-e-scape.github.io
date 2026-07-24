# Participant lists

One file per batch: `batch-1.csv`, `batch-2.csv`, and so on. Open in Excel or Google Sheets,
save as CSV when done.

## Adding a participant

Add one row. Fill in `name` and `issued`. Leave `certificate_id` empty — the build fills it in
and saves it back into the file. Set `status` to `pending` until the certificate PDF is ready.

## Getting one certificate live

The certificate ID has to exist **before** the PDF is designed, since the ID and its QR code get
printed on the certificate.

1. Add the row, `certificate_id` blank, `status` set to `pending`.
2. Run the build (see `../HOW-TO.md`). It writes a new ID into the CSV, e.g. `RES-B2-0009-7MXQ`.
3. Design the certificate PDF using that ID: the name, the ID as readable text, and a QR code
   pointing at `<baseUrl>/c/<the ID>/` (`baseUrl` is in `../config.json`).
4. Upload the PDF to the shared Drive folder. **Set sharing to "Anyone with the link — Viewer"**
   — otherwise the download button only works for whoever uploaded it.
5. Paste the share link into `pdf_link`, set `status` to `issued` (or leave it blank).
6. Run the build again. The record goes live at `<baseUrl>/c/<the ID>/`.

## The columns

| Column | Meaning |
| --- | --- |
| `certificate_id` | Leave blank for new people. Never change one that's already printed. |
| `name` | As it appears on the certificate |
| `issued` | Date on the certificate |
| `status` | `issued`, `pending` or `revoked`. Blank means `issued`. |
| `pdf_link` | Google Drive link to the certificate PDF |

- **`pending`** — no page is created. The ID behaves exactly like an unknown one.
- **`revoked`** — the page stays up and says the certificate was withdrawn, rather than
  disappearing — a missing page reads as a typo, a revocation notice does not.

## Adding a new batch

Copy `batch-2.csv` to `batch-3.csv`, clear the rows, add the new people. The build picks it up
automatically.

## Keep in mind

Everything in these files is published publicly and stays in the repository's history even after
a row is deleted. Never add email, phone, address, ID numbers, grades or marks — the build
refuses to run if it finds those.
