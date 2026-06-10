# Competitive v1 Roadmap

`give-me-job` v1 aims to become a Korea-first AI job application orchestrator. The product should compete with global job-search tools by focusing on Korean hiring workflows, Korean cover letters, platform-specific job discovery, deadline management, evidence-based writing, and user-approved application automation.

## 1. Product Positioning

`give-me-job` is not a generic resume builder and not a blind mass-apply bot. It should be positioned as:

> A Korean job-application agent that discovers relevant postings, manages deadlines, prepares evidence-grounded application packages, reviews Korean cover letters from an HR perspective, and automates application entry only with user approval.

Competitive products such as Simplify, Teal, Rezi, and LazyApply are strong in browser autofill, tracking, ATS keyword optimization, and volume. `give-me-job` should differentiate through Korean-market fit:

- Korean cover-letter question handling: 지원동기, 입사 후 포부, 성장과정, 협업, 문제해결, 직무역량, 가치관.
- `resume.md` evidence-first writing: every strong claim maps to a concrete user-provided experience.
- HR risk review for Korean applications: company-name residue, unsupported metrics, character limits, interview defense risk, and overclaiming.
- Korean platform integrations: 사람인, 고용24, 잡코리아.
- Quality-first application strategy: recommend suitable jobs and reject weak-fit jobs instead of maximizing raw application count.

## 2. Korea-First Platform Strategy

### Priority 1: Saramin

Implement Saramin first because its Job Search API is public and has a clear request model.

- Endpoint: `GET https://oapi.saramin.co.kr/job-search`
- Requires `access-key`.
- Supports JSON/XML response via `Accept` header.
- Supports keyword, location, industry, job code, employment type, education, deadline, publication date, sorting, and pagination.
- Response includes company name, posting URL, active status, posting date, opening timestamp, expiration timestamp, close type, job title, location, industry, job code, experience level, education level, and keywords.
- `count` defaults to 10 and has a documented maximum of 110.

Source: https://oapi.saramin.co.kr/guide/job-search

### Priority 2: Work24

Implement Work24 second because it adds public-sector and government-backed job data.

- Open API is HTTP/XML UTF-8 based.
- Requires membership, API key application, review, and approval.
- Major API groups include 채용정보, 채용행사, 공채속보, 공채기업정보, 직무정보, and 공통코드.
- Because approval is required, implement the adapter behind explicit configuration and provide fixture-based tests first.

Source: https://www.work24.go.kr/cm/e/a/0110/selectOpenApiIntro.do

### Priority 3: JobKorea

Implement JobKorea after API access is confirmed.

- Provides 채용정보 API and 신입공채 API.
- JobKorea documents up to 500 postings and 2-hour update cadence for the relevant API categories.
- API access is primarily provided to public institutions and schools; companies or individuals may be rejected after internal review.
- Detailed posting content and application actions still require navigating to JobKorea detail pages.
- Until approval exists, support manual posting URL intake and browser parsing fallback instead of pretending API access is guaranteed.

Source: https://www.jobkorea.co.kr/service/api

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
│   ├── job-sources/
│   │   ├── saramin.mjs
│   │   ├── work24.mjs
│   │   └── jobkorea.mjs
│   └── apply-adapters/
│       ├── saramin-apply.mjs
│       ├── work24-apply.mjs
│       └── jobkorea-apply.mjs
├── data/
│   ├── jobs/
│   ├── companies/
│   ├── applications/
│   └── schedule.json
└── docs/
```

The repository should remain usable as an agent skill repo. CLI helpers should scaffold, fetch, normalize, validate, and automate browser input, while the agent remains responsible for evidence-grounded judgment and Korean writing quality.

## 4. Common Job Schema

All job-source adapters should normalize into this minimum schema:

```json
{
  "source": "saramin",
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

### v0.2: Saramin Job Discovery

Goal: make job discovery real.

- Add `tools/job-sources/saramin.mjs`.
- Add `tools/fetch-jobs.mjs`.
- Add configuration-based Work24 and JobKorea source adapters for approved API access.
- Add job normalization into the common schema.
- Save fetched postings under `data/jobs/`.
- Support keyword, location, job code, career level, deadline, sort, and count.
- Add `.env.example` for `SARAMIN_ACCESS_KEY`.
- Add fixture tests without requiring real API keys.

Acceptance:

- With a valid key, `node tools/fetch-jobs.mjs --source saramin --keywords "백엔드 Java" --deadline tomorrow` stores normalized jobs.
- Without a key, the tool fails with clear setup guidance.
- Fixture tests validate Saramin JSON, Work24 XML, JobKorea XML parsing, normalization, and deadline fields.

### v0.3: Deadline And Fit Ranking

Goal: prioritize jobs worth applying to.

- Add `tools/schedule-jobs.mjs` for today, tomorrow, and this-week deadlines.
- Add `tools/rank-jobs.mjs` for JD-resume fit scoring.
- Score by role match, tech stack, career level, education, location, evidence coverage, deadline urgency, and application risk.
- Output `Job Fit` Markdown for agent use.

Acceptance:

- The tool can show today/tomorrow/weekly deadlines.
- Fit score includes strong matches, weak matches, missing evidence, recommended resume evidence, and risk.
- Weak-fit jobs can be explicitly marked as "do not apply yet".

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

### v0.5: Saramin Browser Autofill

Goal: automate repetitive application entry without unsafe submission.

- Add Playwright-based `tools/apply-browser.mjs`.
- Add `tools/apply-adapters/saramin-apply.mjs`.
- Use the user's browser session; do not store passwords.
- Support fill-only mode first.
- Detect login, CAPTCHA, sensitive personal information prompts, missing fields, and unsupported page layouts.
- Save screenshots and fill logs under the application package.

Acceptance:

- `node tools/apply-browser.mjs --application applications/<company-role> --platform saramin --mode fill` fills supported fields and stops before submit.
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

### v0.7: Work24 And JobKorea Expansion

Goal: expand Korean job coverage.

- Add Work24 adapter behind API key configuration and XML parsing.
- Add JobKorea adapter only after approved access; before approval, support manual URL intake and browser extraction fallback.
- Add source-specific capability flags so unsupported automation is visible.

Acceptance:

- Source adapters report their capabilities: search, detail, deadline, apply-url, autofill, submit-after-confirm.
- Unsupported API access fails clearly and does not imply official integration.

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

- Job source fixtures: Saramin JSON, Work24 XML, JobKorea fixture or manual URL fixture.
- Normalization tests: source fields map into the common job schema.
- Deadline tests: today, tomorrow, this week, always-open, rolling, expired.
- Ranking tests: strong fit, weak fit, missing evidence, career-level mismatch.
- Application package tests: final blocked without evidence map, final blocked with HR blocker, manual submission reminder required.
- Browser automation tests: fill-only success, login required, CAPTCHA stop, sensitive field stop, unsupported layout fallback.
- Release tests: existing `validate-skills`, `init-application`, and `validate-application` commands continue to pass.

## 8. Immediate Implementation Order

Build in this order:

1. `tools/job-sources/saramin.mjs`
2. `tools/fetch-jobs.mjs`
3. `docs/integrations/saramin.md`
4. `tools/normalize-job.mjs`
5. `tools/schedule-jobs.mjs`
6. `tools/rank-jobs.mjs`
7. `tools/prepare-application.mjs`
8. `tools/apply-browser.mjs`
9. `tools/apply-adapters/saramin-apply.mjs`
10. Work24 and JobKorea adapters

Do not start browser submit automation before job discovery, scheduling, and fit ranking are reliable.

## 9. Success Metrics

Competitive v1 should be measured by:

- Time from job discovery to ready-to-review application package.
- Percentage of final answers with complete evidence map coverage.
- Number of HR blockers caught before submission.
- Autofill success rate on supported Saramin applications.
- Deadline miss rate.
- Interview callback rate tracked manually by the user.
- User-reported Korean cover-letter quality compared with generic AI drafts.

## 10. Release Gate For Competitive v1

Ship v1 only when:

- Saramin job discovery works with real API keys and fixtures.
- Deadline management works for daily and weekly planning.
- Fit score can prioritize and reject jobs.
- Application preparation works from normalized job JSON.
- Korean cover-letter validation includes character/byte limits.
- Saramin autofill works in fill-only mode.
- User-approved submit is guarded by explicit confirmation.
- Submission logs and screenshots are saved.
- Work24 or JobKorea has at least one implemented discovery path or documented fallback.
- Safety docs clearly exclude unattended bulk auto-apply.
