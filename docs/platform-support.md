# Platform Support

`give-me-job` workflow tools are designed to run on:

- Windows PowerShell
- Ubuntu/Linux shell
- macOS shell

## Runtime

Use Node.js `18.17` or newer.

```bash
node --version
npm test
```

The repository has no runtime npm dependencies. `npm test` only runs local Node scripts.

## Path Policy

Tools use native filesystem paths internally and print portable `/`-separated paths in generated messages and logs. User-generated data remains under ignored directories such as:

- `applications/`
- `data/`
- `.tmp-release-check/`

## Cross-Platform Commands

Preferred validation command:

```bash
npm test
```

Equivalent manual commands:

```bash
node tools/validate-skills.mjs
node tools/validate-job-sources.mjs
node tools/validate-job-schedule.mjs
node tools/validate-job-ranking.mjs
node tools/init-application.mjs --company demo --role backend --out .tmp-release-check --force
node tools/validate-application.mjs .tmp-release-check/demo-backend
node tools/validate-application.mjs examples/demo-new-grad-backend/applications/demo-cloud-backend
```

## Environment File

Copy `.env.example` to `.env`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```
