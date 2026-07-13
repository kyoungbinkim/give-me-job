# Quickstart

This guide walks through the real local flow: prepare `resume.md`, provide a Korean job description, let your coding agent create the package, then validate the output. It does not submit anything.

## 1. Install The Agent

```bash
npx give-me-job install --target codex
give-me-job doctor --target codex
```

Use `--target claude-code` or `--target opencode` if that is your coding agent.

## 2. Prepare Inputs

Create or copy a resume evidence file:

```bash
cp examples/demo-new-grad-backend/resume.md resume.md
```

Prepare a JD file or paste the JD into your agent prompt:

```bash
cp examples/demo-new-grad-backend/jd.md jd.md
```

For a real application, replace both files with your own career facts and the actual job post. Keep `resume.md` factual because every strong cover-letter claim should map back to it.

## 3. Create A Package Folder

```bash
node tools/init-application.mjs --company kakao --role backend
```

This creates:

```txt
applications/kakao-backend/
```

The `applications/` directory is ignored by Git because it may contain personal application data.

## 4. Ask Your Agent To Run The Workflow

Prompt your coding agent:

```txt
Read agent.md and prepare the full Korean application package in applications/kakao-backend.
Use resume.md as the only evidence source and jd.md as the job description.
Do not invent experience, do not submit anything, and stop if evidence is missing.
```

The agent should fill:

- `workflow.md`
- `jd-analysis.md`
- `company-values.md`
- `cover-letter-draft.md`
- `evidence-map.md`
- `hr-review.md`
- `cover-letter-final.md`
- `interview-prep.md`
- `submission-checklist.md`

## 5. Validate The Package

```bash
node support/validate/validate-application.mjs applications/kakao-backend
```

Validation checks required files, evidence map presence, HR blockers, and manual submission reminders.

## 6. Review The Output

Open the final files before using any text:

- `cover-letter-final.md`: final Korean 자기소개서 answer draft
- `evidence-map.md`: claim-to-resume evidence mapping
- `hr-review.md`: blockers, warnings, and submission risk
- `interview-prep.md`: follow-up questions and answer points
- `submission-checklist.md`: manual pre-submit checklist

Example output is available at:

```txt
examples/demo-new-grad-backend/applications/demo-cloud-backend/
```

## 7. Submit Manually

Review the final text and checklist yourself. This project does not click submit, send email, bypass CAPTCHA, log in, or transmit personal information.

## Optional: Fetch Jobs

Automated job-source adapters are a TODO — `tools/fetch-jobs.mjs` has no source
registered yet. Provide a posting URL or JD manually for now. See
[integrations/job-sources.md](integrations/job-sources.md).

## Optional: Prioritize Jobs

```bash
node tools/schedule-jobs.mjs --week --jobs data/jobs
node tools/rank-jobs.mjs --resume resume.md --jobs data/jobs
```

Fixture validation:

```bash
node support/validate/validate-job-schedule.mjs
node support/validate/validate-job-ranking.mjs
```
