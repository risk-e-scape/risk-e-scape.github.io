# How to run this site

Written for whoever maintains the certificate list. No programming needed.

## One-time setup

Install **Node.js** from <https://nodejs.org> (take the version marked *LTS*). Click through the
installer with the default options. That is the only thing you need to install.

## The three things you will actually do

### 1. Add or change participants

Open `participants/batch-1.csv` or `batch-2.csv` in Excel or Google Sheets. Add a row per person,
fill in their name and dates, and save as CSV.

Leave the `certificate_id` column empty — it gets filled in for you.

Full instructions: `participants/README.md`.

### 2. Rebuild the site

**Windows:** double-click `build.bat`.
**Mac or Linux:** run `./build.sh` in a terminal.

You will see something like:

```text
Site built.

  batch-1.csv    6 participants
  batch-2.csv    8 participants

  12 issued, 1 revoked, 1 pending (no page yet)

  1 new certificate ID created and saved back into the CSV.
```

If something is wrong it stops and tells you exactly which file and line, for example:

```text
Build stopped. Fix these and run again:

  * batch-2.csv line 5: no name
  * batch-2.csv line 9: marked issued but has no pdf_link
```

Fix the spreadsheet and run it again. Nothing is published until the build succeeds.

### 3. Publish

Commit and push the changes. GitHub Pages picks them up within a minute or two.

If you are not comfortable with Git, ask whoever set the repository up to do this step, or use
GitHub Desktop: it shows the changed files, you write a short note, and click push.

## Previewing before publishing

**Windows:** double-click `preview.bat`. **Mac or Linux:** `./preview.sh`.

Then open <http://localhost:8000> in a browser. Press `Ctrl+C` in the black window to stop it.

Worth checking a certificate record page, for example
`http://localhost:8000/c/RES-B2-0001-HN24/`.

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
