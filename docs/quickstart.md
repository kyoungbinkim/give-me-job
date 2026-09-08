# Quickstart

This guide walks through the real local flow: prepare `resume.md`, provide a Korean job description, let your coding agent create the package, then validate the output. It does not submit anything.

## 1. Install The Agent

```bash
npx give-me-job@latest install --target codex
npx give-me-job@latest doctor --target codex
```

Use `--target claude-code` or `--target opencode` if that is your coding agent.

`npx` does not put a `give-me-job` binary on your `PATH`, so keep the
`npx give-me-job@latest` prefix on every command. If you prefer a bare
`give-me-job` command, install the CLI globally first with
`npm i -g give-me-job`.

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

## 3. Register The Job

Save the supplied JD as `job-import.json`:

```json
{
  "kind": "text",
  "input": "Paste the complete job description here.",
  "metadata": {
    "company": "Kakao",
    "title": "Backend Developer",
    "role": "backend"
  }
}
```

Import it, then copy the returned `jobId`:

```bash
npx give-me-job@latest jobs import --workspace . --input job-import.json
npx give-me-job@latest jobs list --workspace . --format json
```

CSV and URL-list input shapes are documented in
[Integrated Workflow](integrated-workflow.md).

## 4. Prepare The Package And Ask Your Agent

Create a package linked to the selected posting:

```bash
npx give-me-job@latest application prepare --workspace . --job-id "JOB_ID_FROM_PREVIOUS_COMMAND" --role backend
```

The command prints a generated path such as
`applications/application-19ecc434a76ef3f45132`. Copy its `packagePath` value
for later commands. The `applications/` directory is ignored by Git because it
may contain personal application data.

Generate an assessment prompt:

```bash
npx give-me-job@latest request --workspace . --task assess --job-id "JOB_ID_FROM_PREVIOUS_COMMAND"
```

Run the generated prompt in your coding agent. You can also ask directly:

```txt
Read agent.md and prepare the full Korean application package in applications/kakao-backend.
Use resume.md as the only evidence source and jd.md as the job description.
Do not invent experience, do not submit anything, and stop if evidence is missing.
```

The agent resolves your career type first, because new graduates and experienced
hires are drafted and reviewed against different criteria. If your `resume.md`
does not make it obvious, the agent asks rather than guessing. The resolved
value is recorded in `workflow.md`.

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
npx give-me-job@latest application validate --workspace . --package-path "PACKAGE_PATH_FROM_PREVIOUS_COMMAND" --mode structure
npx give-me-job@latest application validate --workspace . --package-path "PACKAGE_PATH_FROM_PREVIOUS_COMMAND" --mode ready
```

`structure` checks the package shape. `ready` additionally checks required
answers, known length rules, resume evidence IDs, HR blockers, review hashes,
and whether the final text changed after review.

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

## Optional: Open The Local Interfaces

```bash
npx give-me-job@latest tui --workspace .
npx give-me-job@latest dashboard --workspace .
```

The dashboard binds only to `127.0.0.1` and stops with `Ctrl+C`. Both interfaces
use the same data and validation logic as the CLI.

## Optional: Normalize A Posting URL

Automated discovery is a TODO, but a supported public posting URL can be saved
without credentials:

```bash
node tools/fetch-jobs.mjs --source url --url "<posting-url>"
```

JobKorea, Linkareer, SK Careers, and LG Careers detail URLs are supported. See
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
