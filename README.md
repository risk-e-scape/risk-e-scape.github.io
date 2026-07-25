# Risk-E-Scape Certificate Verification

Certificate issuing and verification for the DU Risk-E-Scape Certificate Course. Batch 1 and
Batch 2 are certified together at the close of Batch 2.

Live at **<https://risk-e-scape.github.io/>**.

## Which document do I want?

| I want to… | Read |
| --- | --- |
| **Issue certificates** — the actual step-by-step, with commands | **[HOW-TO.md](HOW-TO.md)** |
| Understand how this works and why it is built this way | this file |
| Know what each spreadsheet column means | [participants/README.md](participants/README.md) |
| Add or change a partner logo, or check the EU emblem rules | [src/assets/logos/README.md](src/assets/logos/README.md) |

The procedure lives in HOW-TO.md and nowhere else. It used to be written out in three places,
which meant three copies to keep in step and two of them going stale.

## How the pipeline works

The site is static and the roster is an ordinary tracked file, so there is no deployment
machinery beyond `git push`:

1. Edit `participants/participants.csv`, then run `npm run drafts`. It validates the roster,
   assigns IDs to blank rows, regenerates print-ready PNG and SVG QR codes, and creates watermarked
   draft PDFs for review. Existing IDs are never changed.
2. Review the drafts with the coordinator. Once wording and signatories are approved, run
   `npm run certificates`, upload each PDF to Google Drive with **Anyone with the link — Viewer**
   access, and put its `/view` URL in `pdf_link` with `status` changed to `issued`.
3. `npm test`, then commit and push to `main`. Actions builds the site, uploads only `docs/`, and
   deploys it to GitHub Pages.

Certificate PDFs live in Google Drive, not in this repository. Every issued certificate carries a
unique ID and QR code pointing to one public record:

```text
https://risk-e-scape.github.io/c/RES-B2-0001-HN24/
```

The essential record is plain HTML and remains readable without JavaScript or a backend. A PDF by
itself is not proof because a PDF can be edited; trust comes from the status and details published
on the official record. There is no name search or participant-list page, so a record is reached
through its certificate ID or QR code.

## How a student verifies and gets the PDF

The student, employer or other verifier can use either route:

- Scan the QR code printed on the certificate, which opens the individual record directly.
- Visit <https://risk-e-scape.github.io/verify/>, enter the printed certificate ID and select
  **Verify**.

An issued record displays the verified status, participant name, certificate ID, batch and issue
date. **View certificate PDF** opens the Google Drive PDF in a new tab, where the student can use
Google Drive's download or print controls. A revoked record stays online with a clear warning and no
PDF link. Pending records are not published.

After issuance, course administrators should send the student their certificate ID, verification
URL and PDF link through the approved institutional communication channel. Students do not need a
GitHub account.

## Layout

```text
participants/   participants.csv — the roster, tracked in this repository
certificate-materials/  ignored QR PNG/SVG files and verification-links.csv
certificate-pdfs/  ignored timestamped draft/final PDFs
config.json     course name, contacts, partner logos, EU funding, baseUrl
lib/            csv.js and dates.js — shared by the three pipeline scripts
build.js        generates docs/
prepare-certificates.js  assigns IDs, writes QR codes
generate-certificates.js draws the certificate PDFs
serve.js        local preview server
test.js         checks the built output (keeps its own CSV reader on purpose)
build.bat/.sh   double-click build
preview.bat/.sh double-click preview
src/
  pages/        home, course and privacy templates
  assets/       site.css and logos
docs/           GENERATED — never edit by hand
```

## Build and test

```bash
npm run drafts        # assign IDs, generate QR codes and watermarked draft PDFs
npm run certificates  # generate the final PDFs once wording is approved
npm test              # build and validate the site
npm start             # preview at http://localhost:8000
```

Or double-click `build.bat` / `preview.bat` on Windows, `build.sh` / `preview.sh` elsewhere.

**To actually issue certificates, follow [HOW-TO.md](HOW-TO.md).** It covers these commands in
order, with the approval gate, the Google Drive step and the Windows pitfalls.

### One-time deployment setup

In GitHub, open **Settings → Pages** and select **GitHub Actions** as the source. That is the whole
setup — pushing to `main` builds and deploys.

If `participants/participants.csv` is missing entirely, the workflow publishes informational pages
with zero certificate records rather than failing or inventing sample credentials.

## Record statuses

| Status | Published behavior |
| --- | --- |
| `pending` | No public record is generated. |
| `issued` | A verified record is generated with a link to the Drive PDF. |
| `revoked` | The record remains public with a revocation warning and no PDF link. |

## Certificate IDs

Format `RES-B<batch>-<sequence>-<4 random chars>`, e.g. `RES-B2-0001-HN24`. The random suffix stops
record URLs being walked sequentially by someone who has a certificate but not the repository.

`baseUrl` in `config.json` gets encoded into every QR code. Changing it after certificates are
printed means reprinting them. The certificate also prints the ID and the site address as plain
text next to the QR, so a record can still be found even if a QR code fails to scan.

## Participant privacy

`participants/participants.csv` is tracked in this public repository. That is a deliberate
trade: it removes the secret-based deployment pipeline entirely, at the cost of publishing the
roster as a list rather than only as individually addressable records.

- **Participants must be told and agree before being added.** What they are agreeing to is that
  their name appears in a public list, not merely that a record exists at a URL someone would have
  to already know. Describe the arrangement accurately when seeking agreement.
- **A roster commit is permanent.** Once pushed, forks, clones and caches survive any later
  deletion, and git history keeps it regardless.
- Never add a field the certificate does not carry — `build.js` refuses to build if it finds
  `email`, `phone`, `address`, `nid`, `grade`, `marks` or `dob`. This check matters more now that
  the file is public, not less.
- Record pages remain `noindex` and stay out of the sitemap, and the site offers no search by name,
  so a participant's name should not surface in a search engine for their own name.

If the consortium later decides the list should not be public, the fix is to make this repository
private (GitHub Pages from a private repository requires a paid plan) rather than to reintroduce
the secret pipeline — but note that history already published cannot be recalled.

## License

MIT &copy; 2026 Md Mohsin Hossain. See [LICENSE](LICENSE).

## Still open

- Participant agreement under the current arrangement — the roster is published as a public list,
  so agreement obtained on the basis of "a record reachable only by certificate ID" does not cover
  it. Confirm before the first issuance.
- Batch 1 roster reconciliation — does a clean list of names and completions exist?
- Eligibility rule — what earns a certificate (attendance, assignments, both)?
- Name confirmation — participants approve their own spelling before generation.
- Certificate sign-off — signatories, wording, approved by DU and the consortium.
- `programme.contactEmail` is currently a free Gmail address, not an institutional one —
  swap for `riskescape@du.ac.bd` if the department can create it (one `config.json` edit).
- `euFunding.disclaimer` in `config.json` — check the wording against the actual grant agreement.

## Optional future work

- Participant notification through an approved institutional channel.
