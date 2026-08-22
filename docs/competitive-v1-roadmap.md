# Competitive v1 Roadmap

`give-me-job` v1 aims to become a Korea-first AI job application orchestrator. The product should compete with global job-search tools by focusing on Korean hiring workflows, Korean cover letters, platform-specific job discovery, deadline management, evidence-based writing, and user-approved application automation.

## 1. Product Positioning

`give-me-job` is not a generic resume builder and not a blind mass-apply bot. It should be positioned as:

> A Korean job-application agent that discovers relevant postings, manages deadlines, prepares evidence-grounded application packages, reviews Korean cover letters from an HR perspective, and automates application entry only with user approval.

Competitive products such as Simplify, Teal, Rezi, and LazyApply are strong in browser autofill, tracking, ATS keyword optimization, and volume. `give-me-job` should differentiate through Korean-market fit:

- Korean cover-letter question handling: 지원동기, 입사 후 포부, 성장과정, 협업, 문제해결, 직무역량, 가치관.
- `resume.md` evidence-first writing: every strong claim maps to a concrete user-provided experience.
- HR risk review for Korean applications: company-name residue, unsupported metrics, character limits, interview defense risk, and overclaiming.
- Credential-free operation: the whole workflow runs without an API key, access token, or approved API access.
- Quality-first application strategy: recommend suitable jobs and reject weak-fit jobs instead of maximizing raw application count.

## 2. Korea-First Job Intake Strategy

### Constraint: no credentials

`give-me-job` requires no API key, access token, membership approval, or other
issued credential, and no roadmap item may introduce one. Korean job-board APIs
are gated behind key issuance and manual review, so they are out of scope. An
earlier release shipped credentialed adapters; they were removed for this
reason, and the tooling that read them is gone.

This is a product constraint, not a temporary gap. A user should be able to
clone the repository and run the full workflow immediately.

### Priority 1: Manual posting intake

Make user-supplied postings first-class instead of a fallback.

- Accept a posting URL or pasted JD text as the entry point.
- Normalize it into the common job schema so scheduling and ranking work the
  same way for one manually added posting as for a bulk-fetched one.
- Keep the intake path lossless: capture deadline, company, role, and location
  when the user provides them, and mark what is unknown rather than guessing.

### Priority 2: Local job store

Make a growing personal job list useful without any remote source.

- Let the user add, update, and close postings in `data/jobs/` over time.
- Preserve deadline and status fields so `schedule-jobs` and `rank-jobs` stay
  the primary prioritization surface.

### Priority 3: Credential-free adapters

Add automated discovery only where it works without an issued credential.

- A source qualifies only if it can be read without a key, token, or approval.
- If no source qualifies, automated discovery stays a TODO. Shipping a broken
  or credential-gated adapter is worse than shipping none.
- Register any qualifying adapter in `JOB_SOURCES` in `tools/fetch-jobs.mjs`
  and cover it with fixtures.

## 3. Target Architecture

Add a job discovery and application automation layer on top of the current v0.1 skill package.

```txt
give-me-job/
├── agent.md
├── AGENTS.md
├── skills/
├── tools/
│   ├── fetch-jobs.mjs
│   ├── normalize-job.mjs
│   ├── rank-jobs.mjs
│   ├── schedule-jobs.mjs
│   ├── prepare-application.mjs
│   ├── apply-browser.mjs
│   └── job-sources/          # manual URL adapter; credential-free only
├── data/
│   ├── jobs/
│   ├── companies/
│   ├── applications/
│   └── schedule.json
└── docs/
```

The repository should remain usable as an agent skill repo. CLI helpers should scaffold, fetch, normalize, validate, and automate browser input, while the agent remains responsible for evidence-grounded judgment and Korean writing quality.

Cross-platform status: Implemented in `v0.3.1`. Local tools use Node.js-only scripts, shared platform helpers, portable `/`-separated display paths, and `npm test` for Windows PowerShell, Ubuntu/Linux, and macOS validation.

## 4. Common Job Schema

All job-source adapters should normalize into this minimum schema:

```json
{
  "source": "manual",
  "sourceId": "",
  "url": "",
  "company": "",
  "title": "",
  "role": "",
  "careerLevel": "",
  "experienceMin": null,
  "experienceMax": null,
  "education": "",
  "location": "",
  "employmentType": "",
  "postingDate": "",
  "deadline": "",
  "closeType": "",
  "active": true,
  "keywords": [],
  "raw": {}
}
```

Storage convention:

```txt
data/jobs/YYYY-MM-DD/<source>-<sourceId>.json
```

Root `data/` should be ignored by Git by default because it may contain personal job-search data. Checked-in examples should live under `examples/`.

## 5. Roadmap

### v0.2: Job Discovery

Status: Reverted. The credentialed adapters shipped in `v0.2.0` were removed
because they required issued API keys. Automated discovery is a TODO again.

Goal: make job intake real without credentials.

- Keep `tools/fetch-jobs.mjs` as the registry and normalization entry point.
- Keep job normalization into the common schema.
- Save postings under `data/jobs/`.
- Add manual posting URL and JD intake as the supported path.
- Register a credential-free adapter in `JOB_SOURCES` if one becomes available.

Acceptance:

- A user-supplied posting URL or JD becomes a normalized job file under
  `data/jobs/` with usable deadline fields.
- `node tools/fetch-jobs.mjs --source <name>` exits with clear guidance while no
  source is registered.
- Fixture tests validate normalization and deadline fields with no network
  access and no credentials.

### v0.3: Deadline And Fit Ranking

Status: Implemented.

Goal: prioritize jobs worth applying to.

- [x] Add `tools/schedule-jobs.mjs` for today, tomorrow, and this-week deadlines.
- [x] Add `tools/rank-jobs.mjs` for JD-resume fit scoring.
- [x] Score by role match, tech stack, career level, education, location, evidence coverage, deadline urgency, and application risk.
- [x] Output `Job Fit` Markdown for agent use.
- [x] Add fixture validation with `support/validate/validate-job-schedule.mjs` and `support/validate/validate-job-ranking.mjs`.

Acceptance:

- [x] The tool can show today/tomorrow/weekly deadlines.
- [x] Fit score includes strong matches, weak matches, missing evidence, recommended resume evidence, and risk.
- [x] Weak-fit jobs can be explicitly marked as "Do not apply yet".

### v0.4: One-Command Application Preparation

Goal: turn one selected posting into a complete application package.

- Add `tools/prepare-application.mjs`.
- Accept a normalized job JSON and `resume.md`.
- Create `applications/<company-role>/`.
- Run or instruct the existing agent workflow: JD analysis, optional company values, draft, evidence map, HR review, final, checklist.
- Add Korean character/byte count checks.
- Add cover-letter question splitting for multi-question postings.

Acceptance:

- A selected job can generate a package skeleton and agent-ready workflow.
- Final text is blocked when evidence map is missing or HR blockers remain.
- Character/byte count violations are reported before manual submission.

### v0.5: Browser Autofill

Goal: automate repetitive application entry without unsafe submission.

- Add Playwright-based `tools/apply-browser.mjs`.
- Add per-site fill adapters under `tools/apply-adapters/`.
- Drive the user's own already-signed-in browser session. Never ask for, store, or read credentials.
- Support fill-only mode first.
- Detect login, CAPTCHA, sensitive personal information prompts, missing fields, and unsupported page layouts.
- Save screenshots and fill logs under the application package.

Acceptance:

- `node tools/apply-browser.mjs --application applications/<company-role> --mode fill` fills supported fields and stops before submit.
- A login prompt stops the run and hands control back to the user.
- CAPTCHA or sensitive information prompts stop the run.
- Failure produces manual submission notes.

### v0.6: User-Approved Submit

Goal: support Level 4 automation with explicit approval.

- Add submit-after-confirm mode.
- Require a final summary before clicking submit.
- Require an interactive user confirmation phrase.
- Save submitted timestamp, platform, final files, screenshot, and receipt number when available.
- Never provide bulk, silent, or unattended submit mode.

Acceptance:

- Submit is impossible without explicit user confirmation.
- Submission logs are written only after the platform confirms completion or the user confirms manual submission.
- The agent never marks submitted without confirmation.

### v0.7: Job Coverage Expansion

Goal: expand Korean job coverage without introducing a credential.

- Broaden manual URL intake and page extraction so more posting layouts parse cleanly.
- Add a credential-free adapter only if a qualifying source exists.
- Add source-specific capability flags so unsupported automation is visible.

Acceptance:

- Source adapters report their capabilities: search, detail, deadline, apply-url, autofill, submit-after-confirm.
- No source requires an API key, access token, or approval process.
- An unsupported posting layout fails clearly and falls back to manual intake instead of implying an official integration.

### v1.0: Korea-First Application Console

Goal: make the workflow competitive as a user-facing product.

- Add a local dashboard or robust CLI console.
- Show discovered jobs, D-day, fit score, package status, HR blockers, autofill readiness, submitted status, and result notes.
- Keep Markdown export and agent compatibility.
- Provide at least three real-world scenario demos: new grad backend, experienced backend, non-engineering operations/business.

Acceptance:

- A Korean job seeker can discover postings, prioritize jobs, prepare applications, autofill supported platforms, and track status from one workflow.
- Safety policy remains visible and enforced.
- v1 release includes docs, demos, validation, and automation caveats.

## 6. Automatic Application Policy

Automation levels:

```txt
Level 1: application package generation
Level 2: submission values prepared for copy/paste
Level 3: browser autofill
Level 4: user-approved submit
Level 5: unattended bulk auto-apply
```

`give-me-job` should support Levels 1-4 only. Level 5 is explicitly out of scope.

Rules:

- Login is performed by the user.
- CAPTCHA stops automation.
- Payment, consent, permission changes, or sensitive personal-information prompts stop automation.
- Submit requires a final summary and explicit confirmation.
- No `--yes-submit`, unattended scheduled submit, or bulk silent apply mode.
- Every submit attempt writes a local log.
- Every failure writes manual submission guidance.

## 7. Test Strategy

Required test groups:

- Job intake fixtures: manual URL and pasted JD fixtures, plus a fixture per registered adapter.
- Normalization tests: source fields map into the common job schema.
- Credential tests: no tool reads an API key, access token, or `.env` file.
- Deadline tests: today, tomorrow, this week, always-open, rolling, expired.
- Ranking tests: strong fit, weak fit, missing evidence, career-level mismatch.
- Application package tests: final blocked without evidence map, final blocked with HR blocker, manual submission reminder required.
- Browser automation tests: fill-only success, login required, CAPTCHA stop, sensitive field stop, unsupported layout fallback.
- Release tests: existing `validate-skills`, `init-application`, and `validate-application` commands continue to pass.

## 8. Immediate Implementation Order

Build in this order:

1. `tools/normalize-job.mjs` - implemented
2. `tools/fetch-jobs.mjs` - manual URL source implemented; discovery sources pending
3. `tools/schedule-jobs.mjs` - implemented
4. `tools/rank-jobs.mjs` - implemented
5. Manual posting URL intake into the common job schema - implemented for four public sites
6. `tools/prepare-application.mjs`
7. `tools/apply-browser.mjs`
8. `tools/apply-adapters/`
9. A credential-free job-source adapter, if a qualifying source exists

Do not start browser submit automation before job intake, scheduling, and fit ranking are reliable.

## 9. Success Metrics

Competitive v1 should be measured by:

- Time from job discovery to ready-to-review application package.
- Percentage of final answers with complete evidence map coverage.
- Number of HR blockers caught before submission.
- Autofill success rate on supported application forms.
- Deadline miss rate.
- Interview callback rate tracked manually by the user.
- User-reported Korean cover-letter quality compared with generic AI drafts.

## 10. Release Gate For Competitive v1

Ship v1 only when:

- The full workflow runs with no API key, access token, or other issued credential.
- Job intake works from a user-supplied posting URL or JD, verified by fixtures.
- Deadline management works for daily and weekly planning.
- Fit score can prioritize and reject jobs.
- Application preparation works from normalized job JSON.
- Korean cover-letter validation includes character/byte limits.
- Autofill works in fill-only mode on at least one supported form.
- User-approved submit is guarded by explicit confirmation.
- Submission logs and screenshots are saved.
- Safety docs clearly exclude unattended bulk auto-apply.
