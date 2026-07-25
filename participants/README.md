# Participant list

The live roster is `participants.csv`, tracked in this repository. Open it in Excel or Google
Sheets and save it as CSV when done.

**It is public.** Everyone listed appears in the published repository, not only on their own
certificate record page. Obtain each participant's agreement before adding them.

## Adding a participant

Add one row. Fill in `batch` and `name`. Leave `certificate_id` empty — the build fills it in
and saves it back into the private file. Set `status` to `pending` until the certificate PDF is
ready. Add the issue date only when the certificate is actually issued.

The batch number must be explicit for a new record. Existing records are also checked to ensure the
`batch` column matches the batch encoded in IDs such as `RES-B2-...`.

## Getting one certificate live

The certificate ID has to exist **before** the PDF is designed, since the ID and its QR code get
printed on the certificate.

1. Add the row, `certificate_id` blank, `status` set to `pending`.
2. Run `npm run drafts` (see `../HOW-TO.md`). It writes a new ID into the CSV when needed
   and generates a PNG and SVG QR code, verification-links spreadsheet and watermarked draft PDF.
3. Review the generated watermarked draft PDF, then design or revise the approved certificate
   using that ID, QR code and verification URL. The name and ID must also appear as readable text.
4. After officials approve the design and wording, run `npm run certificates` to create the
   final PDF. Do not upload a draft PDF.
5. Upload the final PDF to the shared Drive folder. **Set sharing to "Anyone with the link — Viewer"**
   — otherwise the verification link only works for whoever uploaded it.
6. Paste the share link into `pdf_link`, enter the issue date, set `status` to `issued`, then run
   `npm test`, commit and push. The record goes live at `<baseUrl>/c/<the ID>/`.

## The columns

| Column | Meaning |
| --- | --- |
| `batch` | Required batch number, such as `2`. |
| `certificate_id` | Leave blank for new people. Never change one that's already printed. |
| `name` | As it appears on the certificate |
| `issued` | Date on the certificate |
| `status` | `issued`, `pending` or `revoked`. Blank means `issued`. |
| `pdf_link` | Google Drive link to the certificate PDF |

- **`pending`** — no page is created. The ID behaves exactly like an unknown one.
- **`revoked`** — the page stays up and says the certificate was withdrawn, rather than
  disappearing — a missing page reads as a typo, a revocation notice does not.

## Adding a new batch

Add new rows with the new number in `batch` and leave `certificate_id` blank. The build continues
the sequence within that explicit batch. No separate file is needed.

## Keep in mind

This file is public and each issued row also becomes a public certificate page, so obtain the
participant's agreement before adding them. Never add email, phone, address, ID numbers, grades,
marks or dates of birth — the build refuses to run if it finds those columns.

Assign IDs before pushing. The build will not invent one on a GitHub Actions runner, because the
runner is discarded afterwards and the following build would generate a different ID, moving a
record that may already be printed on paper. `npm run drafts` assigns them locally; commit the CSV
it writes.

Keep the generated QR files and timestamped draft PDFs in the ignored local folders for coordinator
review. They are not uploaded to the website.
