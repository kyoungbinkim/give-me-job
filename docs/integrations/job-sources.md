# Job Source Integrations

Automated job discovery is **not implemented yet**. User-supplied public
posting URLs are supported as a separate, credential-free intake path.

## Manual URL intake

```bash
node tools/fetch-jobs.mjs --source url --url "<posting-url>"
```

Supported detail pages:

- JobKorea (`jobkorea.co.kr`)
- Linkareer (`linkareer.com`)
- SK Careers (`skcareers.com`)
- LG Careers (`careers.lg.com`)

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

Unsupported hosts fail clearly and fall back to pasted JD text. The tool
accepts HTTPS URLs only and does not accept credentials in a URL.

## Automated discovery

Search and bulk discovery remain a TODO. A future search adapter must work
without issued credentials and return jobs shaped by `normalizeJob`.

To add one:

1. Create an adapter under `tools/job-sources/<source>.mjs`.
2. Register it in `JOB_SOURCES` in `tools/fetch-jobs.mjs`.
3. Add its flags to `tools/install-adapters.mjs`.
4. Add fixture validation with no live network dependency.
