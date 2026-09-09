# Job Source Integrations

Automated job discovery is **not implemented yet**. User-supplied public
posting URLs are supported as a separate, credential-free intake path.

## Manual URL intake

```bash
node tools/fetch-jobs.mjs --source url --url "<posting-url>"
```

The integrated CLI, TUI, and dashboard accept up to 20 posting URLs per import,
one per line. They save every successfully read posting to the shared workspace. Jobs
whose deadline is earlier than today in `Asia/Seoul` are removed from the
active store and all job lists during import, refresh, and listing. Existing
application packages and tracker history remain available.

Pages with dedicated extraction:

- JobKorea (`jobkorea.co.kr`)
- Linkareer (`linkareer.com`)
- SK Careers (`skcareers.com`)
- LG Careers (`careers.lg.com`)

Other public HTTPS job pages are accepted through a generic extractor. It uses
Schema.org `JobPosting` JSON-LD when available, then falls back to public page
metadata and readable `main` or `article` content. Generic results always carry
a verification warning because application questions, deadlines, or dynamically
rendered content may be missing.

The normalized record is saved under:

```txt
data/jobs/YYYY-MM-DD/<source>-<sourceId>.json
```

The common job fields contain company, title, role, career level, location,
employment type, dates, and keywords when public. The `raw` object also keeps:

- `postingText`
- `positions`
- `questions`
- `attachments`
- `applyUrl`
- `extractionWarnings`

Public pages do not always expose a single role, application questions, length
limits, or the contents of attached PDFs and images. Those cases are reported
as missing inputs; the workflow does not infer them from another role.

## No credentials

`give-me-job` requires no API key, access token, login cookie, or approved API
access. URL intake reads only public posting responses and never applies,
submits, logs in, or bypasses CAPTCHA.

The tool accepts HTTPS URLs only, rejects credentials and non-public hosts, and
does not follow a generic redirect to a different host. Pages that do not expose
enough company, title, and posting content fall back to pasted JD text.

## Automated discovery

Search and bulk discovery remain a TODO. A future search adapter must work
without issued credentials and return jobs shaped by `normalizeJob`.

To add one:

1. Create an adapter under `tools/job-sources/<source>.mjs`.
2. Register it in `JOB_SOURCES` in `tools/fetch-jobs.mjs`.
3. Add its flags to `tools/install-adapters.mjs`.
4. Add fixture validation with no live network dependency.
