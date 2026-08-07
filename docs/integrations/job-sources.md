# Job Source Integrations (TODO)

Automated job discovery is **not implemented yet**. The earlier adapters were
removed so that job sourcing can be reintroduced later through a single
normalized adapter.

Until then, `tools/fetch-jobs.mjs` ships as a placeholder with an empty source
registry. Running it without a registered source exits with a clear TODO
message instead of fetching anything.

## No credentials

`give-me-job` requires no API key, access token, or other issued credential,
and none of its tools read one. A future adapter must keep it that way: a job
source that cannot be used without a credential or an approval process is out
of scope. Provide a posting URL or JD text manually instead.

## Current state

- `tools/fetch-jobs.mjs` — normalizes and writes jobs, but no sources are
  registered (`JOB_SOURCES = {}`).
- `tools/normalize-job.mjs` — the common job schema and `writeJobs` helper are
  unchanged and reused by any future adapter.
- `skills/job-searcher/SKILL.md` — guides users to provide a JD or posting URL
  manually while automated search is unavailable.

## Adding a job source later

1. Confirm the source is usable without a credential. If it is not, stop here.
2. Create an adapter under `tools/job-sources/<source>.mjs` that exports an
   async function returning jobs shaped by `normalizeJob`.
3. Register it in the `JOB_SOURCES` map in `tools/fetch-jobs.mjs`.
4. Add any required flags to the `fetch-jobs` entry in
   `tools/install-adapters.mjs`.
5. Add a fixture-based validation script and wire it into `package.json`.

## Output

When a source exists, fetched jobs are normalized into the common job schema
and saved under:

```txt
data/jobs/YYYY-MM-DD/<source>-<sourceId>.json
```

`data/` is ignored by Git because it may contain personal job-search data.
