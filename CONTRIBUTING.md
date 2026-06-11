# Contributing to give-me-job

`give-me-job` is scoped to the Korean hiring market. Contributions should improve Korean job discovery, Korean JD analysis, Korean resume evidence structuring, Korean cover-letter drafting, HR review, or safe application-package preparation.

## What We Accept

- Skill improvements under `skills/`
- Korean job-source adapters, fixtures, and validation updates
- Documentation that improves Korean hiring-market usage
- Tests for existing tools and workflow behavior
- Bug fixes that preserve evidence-grounded writing and safe submission boundaries

## Out Of Scope

- Non-Korean hiring workflows
- Automatic final submission or bulk applying
- Claims, metrics, or sample content that invent applicant experience
- Changes that require secrets, credentials, or private user data in the repository

## Development

Use Node.js 18.17 or newer.

```bash
npm test
```

For focused checks:

```bash
node tools/validate-skills.mjs
node tools/validate-job-sources.mjs
node tools/validate-job-schedule.mjs
node tools/validate-job-ranking.mjs
```

## Pull Request Checklist

- Keep the Korea-only scope explicit.
- Ground cover-letter behavior in `resume.md` evidence.
- Do not add generated user application packages under `applications/`.
- Add or update tests/fixtures when changing tools.
- Run `npm test` before opening the PR.

## Security And Privacy

Do not include personal application data, API keys, access tokens, browser cookies, resumes from real third parties, or private company documents. If a contribution touches job-source access, document required environment variables in `.env.example` without real values.
