# Risk-E-Scape Certificate Verification

Certificate issuing and verification for the DU Risk-E-Scape Certificate Course. Batch 1 and
Batch 2 are certified together at the close of Batch 2.

Live at **<https://risk-e-scape.github.io/>**.

**Maintaining the participant lists needs no programming — see [HOW-TO.md](HOW-TO.md).**

## How the pipeline works

The site is static, but the participant roster remains private:

1. An authorized maintainer keeps `participants/participants.csv` locally. Git ignores this file.
2. `npm run refresh-drafts` validates the roster, assigns IDs to blank rows, regenerates print-ready
   PNG and SVG QR codes, and creates watermarked draft PDFs for review. Existing IDs are preserved.
3. The maintainer reviews the retained draft certificate PDFs with the coordinator. Any name or
   wording change is followed by another `npm run refresh-drafts`; existing IDs are not changed.
4. The PDF is uploaded to Google Drive with **Anyone with the link — Viewer** access, and its
   `/view` URL is added to the private CSV with `status` changed to `issued`.
5. `npm run deploy-roster` validates the private roster, replaces the `PARTICIPANTS_CSV` repository
   secret and starts the deployment workflow on `main`.
6. The temporary Actions runner recreates the private CSV from the secret, builds and tests the
   site, uploads only `docs/`, and deploys it to GitHub Pages. The runner is then discarded.

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
URL and PDF link through the approved institutional communication channel. Students do not need
access to the private CSV or a GitHub account.

## Layout

```text
participants/   participants.example.csv — public template
                participants.csv — ignored local working roster
certificate-materials/  ignored QR PNG/SVG files and verification-links.csv
certificate-pdfs/  ignored timestamped draft/final PDFs
config.json     course name, contacts, partner logos, EU funding, baseUrl
build.js        generates docs/
serve.js        local preview server
test.js         checks the built output
build.bat/.sh   double-click build
preview.bat/.sh double-click preview
src/
  pages/        home, course and privacy templates
  assets/       site.css and logos
docs/           GENERATED — never edit by hand
```

## Build and test

```bash
npm run prepare-certificates  # assign IDs and generate QR/verification materials
npm test                      # build and validate the site
npm run deploy-roster         # upload private CSV secret and deploy
npm start                     # preview at http://localhost:8000
```

Or double-click `build.bat` / `preview.bat` on Windows, `build.sh` / `preview.sh` elsewhere.

### One-time deployment setup

1. Install the GitHub CLI: <https://cli.github.com/>. On Windows, run `winget install GitHub.cli`.
2. In a project terminal, run `gh auth login`, choose **GitHub.com → HTTPS → Login with a web
   browser**, and approve access to `risk-e-scape/risk-e-scape.github.io`.
3. Commit and push the public source changes in this repository to `main`.
4. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the source.

`npm run deploy-roster` then replaces the `PARTICIPANTS_CSV` secret automatically and triggers the
workflow. It deliberately refuses to run when the public source changes are not committed and
pushed, so the remote workflow always uses the expected code.

GitHub does not let maintainers read a saved secret back. Keep a protected institutional backup of
the authoritative CSV. If the secret is absent, the workflow safely publishes informational pages
with zero certificate records rather than sample credentials.

### Full operator sequence

1. Open the local ignored `participants/participants.csv` and replace the three dummy names with the
   coordinator's roster. Keep existing IDs if those draft records are being corrected; leave the ID
   blank only for a genuinely new participant. Keep each row as `pending`.
2. Run `npm run refresh-drafts`. It assigns new IDs when needed and creates:
   - `certificate-materials/verification-links.csv` — ID, verification URL and QR filenames
   - `certificate-materials/<ID>.png` — print-ready QR code
   - `certificate-materials/<ID>.svg` — scalable QR code
3. Review the newest timestamped folder under `certificate-pdfs/`. It contains one watermarked
   **DRAFT — NOT VALID FOR ISSUE** PDF per row. Scan each QR code and inspect the certificate ID,
   name placement, course period, signature space and print margins. Drafts are intentionally kept
   locally for coordinator review and are ignored by Git.
4. The Batch 2 template currently states: **for successful completion of the course conducted** from
   **3 July 2026 to 1 August 2026**, and displays **Batch 2**. When the coordinator approves the
   wording and signatories, update `certificate.status` to `approved` and replace every
   `To be confirmed` field in `config.json`. Enter the actual issue date for each non-revoked row,
   then run `npm run generate-certificates`.
5. Upload each approved PDF to the Google Drive folder. Set **Anyone with the link — Viewer**,
   copy the `/view` URL into `pdf_link`, and change `status` from `pending` to `issued`.
6. Run `npm test` and `npm run deploy-roster`.
7. After the Actions run succeeds, send each student their PDF URL, certificate ID and verification
   URL.

### Growth beyond the first year

A GitHub Actions secret has a 48 KB limit. Fifty typical records are usually well below that limit;
the deploy command warns at 35 KB and stops at 45 KB. Keep the CSV private and backed up. When the
warning appears, move the authoritative roster to a separate private GitHub repository or approved
institutional database/storage, then change the workflow to retrieve it with a restricted token.
Do not split the public verification roster into public CSV files.

## Record statuses

| Status | Published behavior |
| --- | --- |
| `pending` | No public record is generated. |
| `issued` | A verified record is generated with a link to the Drive PDF. |
| `revoked` | The record remains public with a revocation warning and no PDF link. |

## Certificate IDs

Format `RES-B<batch>-<sequence>-<4 random chars>`, e.g. `RES-B2-0001-HN24`. The random suffix
matters — without it, IDs are sequential and the whole list could be walked.

`baseUrl` in `config.json` gets encoded into every QR code. Changing it after certificates are
printed means reprinting them. The certificate also prints the ID and the site address as plain
text next to the QR, so a record can still be found even if a QR code fails to scan.

## Participant privacy

The live roster is kept in a Git-ignored `participants/participants.csv` and supplied to the
GitHub Actions build through the `PARTICIPANTS_CSV` repository secret. It must never be committed
to this public repository.

- Each issued row still creates a public record reachable by certificate ID; participants must be
  told and agree before issuance.
- Never add a field the certificate does not carry — `build.js` refuses to build if it finds
  `email`, `phone`, `address`, `nid`, `grade`, `marks` or `dob`.
- Protect a separate backup of the private roster and restrict access to authorized maintainers.

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

## Optional future work

- Participant notification through an approved institutional channel.
