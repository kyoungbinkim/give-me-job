# Contributing to give-me-job

`give-me-job` is scoped to the Korean hiring market. Contributions should improve Korean job discovery, Korean JD analysis, Korean resume evidence structuring, Korean cover-letter drafting, HR review, or safe application-package preparation.

## What We Accept

- Skill improvements under `skills/`
- Credential-free Korean job-source adapters, fixtures, and validation updates
- Documentation that improves Korean hiring-market usage
- Tests for existing tools and workflow behavior
- Bug fixes that preserve evidence-grounded writing and safe submission boundaries

## Out Of Scope

- Non-Korean hiring workflows
- Automatic final submission or bulk applying
- Claims, metrics, or sample content that invent applicant experience
- Changes that require secrets, credentials, or private user data in the repository
- Integrations gated behind an API key, access token, or approval process

## Development

Use Node.js 18.17 or newer.

```bash
npm test
```

For focused checks:

```bash
node tests/validate/validate-skills.mjs
node support/validate/validate-job-schedule.mjs
node support/validate/validate-job-ranking.mjs
```

## Pull Request Checklist

- Keep the Korea-only scope explicit.
- Ground cover-letter behavior in `resume.md` evidence.
- Do not add generated user application packages under `applications/`.
- Add or update tests/fixtures when changing tools.
- Run `npm test` before opening the PR.

## Security And Privacy

Do not include personal application data, API keys, access tokens, browser cookies, resumes from real third parties, or private company documents.

This project runs without credentials, and contributions must keep it that way. Do not add a job source, tool, or workflow step that requires an API key, access token, membership approval, or any other issued credential. If a job source cannot be used without one, it is out of scope — support manual posting URL or JD intake instead.
