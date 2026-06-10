# Quickstart

This guide creates one local application package. It does not submit anything.

## 1. Validate The Repository

```bash
npm test
```

## 2. Create A Package Folder

```bash
node tools/init-application.mjs --company kakao --role backend
```

This creates:

```txt
applications/kakao-backend/
```

The `applications/` directory is ignored by Git because it may contain personal application data.

## 3. Run The Agent Workflow

Ask your coding agent:

```txt
Read agent.md and prepare the full package in applications/kakao-backend using my resume.md and this JD.
```

The agent should fill:

- `jd-analysis.md`
- `company-values.md`
- `cover-letter-draft.md`
- `evidence-map.md`
- `hr-review.md`
- `cover-letter-final.md`
- `submission-checklist.md`
- `workflow.md`

## 4. Validate The Package

```bash
node tools/validate-application.mjs applications/kakao-backend
```

Validation checks required files, evidence map presence, HR blockers, and manual submission reminders.

## 5. Submit Manually

Review the final text and checklist yourself. This project does not click submit, send email, bypass CAPTCHA, log in, or transmit personal information.

## Optional: Fetch Jobs

Saramin live API:

```bash
node tools/fetch-jobs.mjs --source saramin --keywords "백엔드 Java" --deadline tomorrow --count 20
```

Fixture-based validation without API keys:

```bash
node tools/validate-job-sources.mjs
```

See [integrations/job-sources.md](integrations/job-sources.md).

## Optional: Prioritize Jobs

```bash
node tools/schedule-jobs.mjs --week --jobs data/jobs
node tools/rank-jobs.mjs --resume resume.md --jobs data/jobs
```

Fixture validation:

```bash
node tools/validate-job-schedule.mjs
node tools/validate-job-ranking.mjs
```
