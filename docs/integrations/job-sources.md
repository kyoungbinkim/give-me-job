# Job Source Integrations

`give-me-job` v0.2 adds job discovery tools for Korean job platforms. Saramin is the primary live API target. Work24 and JobKorea are implemented as configuration-based adapters because their public documentation requires approval or issued access details before live calls are possible.

## Setup

Copy `.env.example` to `.env` and fill the keys you have.

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Saramin

Saramin is the recommended first integration.

```bash
node tools/fetch-jobs.mjs --source saramin --keywords "백엔드 Java" --deadline tomorrow --count 20
```

Useful options:

- `--keywords`
- `--location` or `--loc-cd`
- `--job-mid-cd`
- `--job-cd`
- `--job-type`
- `--education`
- `--deadline today|tomorrow`
- `--sort pd|pa|ud|ua|da|dd|rc|ac`
- `--count`
- `--fields posting-date,expiration-date,keyword-code,count`

The tool reads `SARAMIN_ACCESS_KEY` from `.env` or accepts `--access-key`.

Dry run with a fixture:

```bash
node tools/fetch-jobs.mjs --source saramin --fixture tests/fixtures/saramin-job-search.json --dry-run
```

## Work24

Work24 Open API requires membership, API key application, review, and approval. After approval, set `WORK24_AUTH_KEY` as an environment variable or configure:

```env
WORK24_AUTH_KEY=
```

The tool has built-in defaults for Work24 public recruit notices (L21) and company information (L31). Use `--endpoint` or `--company-endpoint` only when Work24 changes an approved endpoint.

Search current recruit notices:

```bash
node tools/fetch-jobs.mjs --source work24 --dry-run --active-only --param.empWantedTitle "데이터 사이언스" --param.display 10
node tools/fetch-jobs.mjs --source work24 --dry-run --active-only --param.coClcd 10 --param.display 10
```

Search company information:

```bash
node tools/fetch-jobs.mjs --source work24 --mode company --dry-run --param.coNm "삼성"
```

Pass additional Work24 parameters with `--param.<name>`.

Fixture test:

```bash
node tools/fetch-jobs.mjs --source work24 --fixture tests/fixtures/work24-jobs.xml --dry-run
```

## JobKorea

JobKorea API access is approval-based and may be restricted for individuals or general companies. After approval, JobKorea issues a call URL. Configure:

```env
JOBKOREA_API_URL=
```

Then run:

```bash
node tools/fetch-jobs.mjs --source jobkorea
```

Pass issued query parameters with `--param.<name>` when needed.

Fixture test:

```bash
node tools/fetch-jobs.mjs --source jobkorea --fixture tests/fixtures/jobkorea-jobs.xml --dry-run
```

## Output

Fetched jobs are normalized into the common job schema and saved under:

```txt
data/jobs/YYYY-MM-DD/<source>-<sourceId>.json
```

`data/` is ignored by Git because it may contain personal job-search data.

## Validation

Run fixture-based source validation without API keys:

```bash
node support/validate/validate-job-sources.mjs
```

This validates Saramin JSON, Work24 XML, and JobKorea XML fixtures against the common job schema.
