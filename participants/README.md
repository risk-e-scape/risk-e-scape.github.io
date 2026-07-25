# Participant list

The live roster is `participants.csv`, tracked in this repository. Open it in Excel or Google
Sheets and save it as CSV when done.

**It is public.** Everyone listed appears in the published repository, not only on their own
certificate record page. Obtain each participant's agreement before adding them.

## Adding a participant

Add one row. Fill in `batch` and `name`. Leave `certificate_id` empty — the build fills it in
and saves it back into this file. Set `status` to `pending` until the certificate PDF is
ready. Add the issue date only when the certificate is actually issued.

The batch number must be explicit for a new record. Existing records are also checked to ensure the
`batch` column matches the batch encoded in IDs such as `RES-B2-...`.

## Getting a certificate live

The full procedure lives in **[../HOW-TO.md](../HOW-TO.md)** — it is written out once, there, so
there is only ever one version to keep current.

The one thing worth knowing before you start: the certificate ID has to exist **before** the PDF is
designed, because the ID and its QR code get printed on the certificate. `npm run drafts` assigns
it and writes it back into this file.

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
