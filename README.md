# give-me-job

![give-me-job banner](docs/assets/give-me-job-banner.jpg)

`give-me-job` is an AI agent toolkit for Korean job applications. It helps you turn scattered career notes, a Korean job post, and company context into a focused application package: JD analysis, evidence-grounded 자기소개서 drafts, HR risk review, interview defense, and a manual submission checklist.

Most job-application tools optimize for speed. `give-me-job` optimizes for confidence: every strong claim should trace back to your `resume.md`, every risky sentence gets reviewed before final use, and every final answer should be something you can defend in an interview.

Use it when you want an agent to help with 취업준비 without inventing experience, exaggerating metrics, or auto-submitting applications. The current demo focuses on a backend role, but the workflow is designed for Korean job applications across tech, business, support, creative, and operations roles. This repository prepares the materials; you stay in control of review and final submission.

Korean search keywords: 자기소개서, 취업준비, 한국 취업, 취업 에이전트, 개발자 취업준비, 개발자 자기소개서.

Use [`agent.md`](agent.md) as the orchestrator for the full workflow. Repository-level agent instructions are in [`AGENTS.md`](AGENTS.md). Korean documentation is available at [`docs/README-ko.md`](docs/README-ko.md).

## Features

- Resume evidence intake: structure user-provided career facts into reusable `resume.md` evidence.
- JD analysis: extract role requirements, evaluation criteria, keywords, gaps, and risks from Korean job posts.
- Company-values analysis: use optional mission, culture, values, or talent-profile material for positioning.
- Korean cover-letter drafting: write answers grounded in `resume.md`, JD analysis, and optional company context.
- HR review: check exaggeration, unsupported claims, company-name residue, and pre-submission blockers.
- Interview preparation: generate follow-up questions and evidence-backed answer points for interview defense.
- Application packaging: create one `applications/<company-role>/` package with a manual checklist.
- Korean job-source tools: support Saramin, Work24, and JobKorea adapters plus natural-language job search guidance, deadline scheduling, and fit ranking.

## Documentation

| Document | Purpose |
| --- | --- |
| [Korean README](docs/README-ko.md) | Korean detailed guide and documentation hub |
| [Quickstart](docs/quickstart.md) | Minimal local workflow for one application package |
| [npm Install](docs/npm-install.md) | npm-based skill and agent installation |
| [Platform Support](docs/platform-support.md) | Windows PowerShell, Ubuntu/Linux, and macOS support |
| [Safety Policy](docs/safety.md) | Allowed actions, disallowed actions, and blocker examples |
| [Release Checklist](docs/release-checklist.md) | Pre-release validation checklist |
| [Competitive v1 Roadmap](docs/competitive-v1-roadmap.md) | Korea-only product roadmap |
| [Job Source Integrations](docs/integrations/job-sources.md) | Saramin, Work24, and JobKorea setup |

## Requirements

Use Node.js `18.17` or newer.

```bash
node --version
npm --version
```

The local tools support:

- Windows PowerShell
- Ubuntu/Linux shell
- macOS shell

To use this repository directly:

```bash
git clone https://github.com/kyoungbinkim/give-me-job.git
cd give-me-job
npm test
```

## Installation

The simplest install path is `npx`:

```bash
npx give-me-job install
```

This installs the eight domain skills plus the `give-me-job` orchestrator agent for supported coding agents in your user profile. The support bundle includes `agent.md`, `tools/`, `templates/`, and validation fixtures.

You can also install the CLI globally:

```bash
npm i -g give-me-job
give-me-job install
```

Install every supported target:

```bash
give-me-job install --target all
```

Install one target:

```bash
give-me-job install --target codex
give-me-job install --target opencode
give-me-job install --target claude-code
```

Install into the current project instead of your user profile:

```bash
give-me-job install --scope project --target all
```

Preview changes before writing files:

```bash
give-me-job install --dry-run
```

By default, the installer refuses to overwrite files that differ from the packaged version. Use `--force` only when you intentionally want to replace existing installed files. The installer writes timestamped `.bak-*` backups first.

```bash
give-me-job install --target codex --force
```

Check the installation:

```bash
give-me-job doctor
```

Uninstall files tracked in the install manifest:

```bash
give-me-job uninstall --target all
```

`uninstall` removes only files recorded in `~/.give-me-job/install-manifest.json` and only when the current file still matches the installed hash.

## Install Paths

Default user-scope install paths:

```txt
Codex:       ~/.agents/skills/<skill>/SKILL.md
Codex:       ~/.codex/agents/give-me-job.toml
Codex:       ~/.codex/give-me-job/

OpenCode:    ~/.config/opencode/skills/<domain-skill>/SKILL.md
OpenCode:    ~/.config/opencode/agents/give-me-job.md
OpenCode:    ~/.config/opencode/give-me-job/

Claude Code: ~/.claude/skills/<domain-skill>/SKILL.md
Claude Code: ~/.claude/agents/give-me-job.md
Claude Code: ~/.claude/give-me-job/
```

Project-scope install paths:

```txt
Codex:       .agents/skills/<skill>/SKILL.md
Codex:       .codex/agents/give-me-job.toml

OpenCode:    .opencode/skills/<domain-skill>/SKILL.md
OpenCode:    .opencode/agents/give-me-job.md

Claude Code: .claude/skills/<domain-skill>/SKILL.md
Claude Code: .claude/agents/give-me-job.md
```

## Quickstart

Validate the repository:

```bash
npm test
```

Create one company-specific package folder:

```bash
node tools/init-application.mjs --company kakao --role backend
```

This creates:

```txt
applications/kakao-backend/
```

Then ask your coding agent:

```txt
Read agent.md and complete the package in applications/kakao-backend using my resume.md and this JD.
```

Validate the completed package:

```bash
node support/validate/validate-application.mjs applications/kakao-backend
```

For a complete runnable walkthrough, see [Quickstart](docs/quickstart.md).

## Workflow

```txt
JD URL / JD text
        |
        v
agent.md intake ---- missing or weak ----> resume-intake
        |                                      |
        v                                      v
existing resume.md <---------------------- resume.md
        |
        v
jd-analyzer
        |
        v
JD analysis <---- optional ---- company-values-analyzer
        |
        v
cover-letter-writer
        |
        v
hr-reviewer
        |
        v
interview-prep
        |
        v
application-packager
        |
        v
applications/<company-role>/
        |
        v
User reviews and submits manually
```

The orchestrator must stop when required inputs are missing, when `resume.md` does not support a strong claim, or when the next action would submit, send, log in, bypass CAPTCHA, or transmit personal information.

## Package Output

```txt
applications/
`-- <company-role>/
    |-- workflow.md
    |-- jd-analysis.md
    |-- company-values.md
    |-- cover-letter-draft.md
    |-- hr-review.md
    |-- cover-letter-final.md
    |-- evidence-map.md
    |-- interview-prep.md
    `-- submission-checklist.md
```

`applications/` is ignored by Git because it may contain personal application data.

## Example Output

A checked-in demo package shows the expected output shape:

```txt
examples/demo-new-grad-backend/applications/demo-cloud-backend/
|-- cover-letter-final.md
|-- evidence-map.md
|-- hr-review.md
|-- interview-prep.md
`-- submission-checklist.md
```

The demo illustrates the core promise of the agent:

- `cover-letter-final.md`: Korean 자기소개서 text grounded in the demo resume.
- `evidence-map.md`: each key claim is mapped back to resume evidence.
- `hr-review.md`: unsupported claims, blockers, and submission risks are checked before final use.
- `interview-prep.md`: likely follow-up questions are prepared from the same evidence.
- `submission-checklist.md`: the user is reminded to review and submit manually.

Start with [`examples/demo-new-grad-backend/resume.md`](examples/demo-new-grad-backend/resume.md), [`examples/demo-new-grad-backend/jd.md`](examples/demo-new-grad-backend/jd.md), and the generated package under [`examples/demo-new-grad-backend/applications/demo-cloud-backend/`](examples/demo-new-grad-backend/applications/demo-cloud-backend/).

## Skills

- `resume-intake`: converts raw career facts into structured `resume.md` evidence.
- `jd-analyzer`: analyzes job descriptions for requirements, evaluation criteria, keywords, and gaps.
- `company-values-analyzer`: analyzes optional company values, culture, mission, or talent-profile material.
- `cover-letter-writer`: drafts Korean cover-letter answers grounded in evidence.
- `hr-reviewer`: checks application materials from an HR risk perspective.
- `interview-prep`: prepares interview follow-up questions and answer points grounded in evidence.
- `application-packager`: assembles the company-specific package and manual submission checklist.
- `job-searcher`: searches Korean job postings and company information through Work24-backed tools.

## Job Sources And Prioritization

Prepare an environment file.

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

With a Saramin API key, set `SARAMIN_ACCESS_KEY` in `.env` and fetch jobs:

```bash
node tools/fetch-jobs.mjs --source saramin --keywords "backend Java" --deadline tomorrow --count 20
```

With a Work24 API key, set `WORK24_AUTH_KEY` as an environment variable or in `.env` and search current public recruit notices. Work24 L21/L31 URLs are built into the tool by default:

```bash
node tools/fetch-jobs.mjs --source work24 --dry-run --active-only --param.empWantedTitle "데이터 사이언스" --param.display 10
node tools/fetch-jobs.mjs --source work24 --dry-run --active-only --param.coClcd 10 --param.display 10
node tools/fetch-jobs.mjs --source work24 --mode company --dry-run --param.coNm "삼성"
```

Run fixture-based validation without API keys:

```bash
node support/validate/validate-job-sources.mjs
```

After fetching jobs, check deadlines and fit ranking:

```bash
node tools/schedule-jobs.mjs --week --jobs data/jobs
node tools/rank-jobs.mjs --resume resume.md --jobs data/jobs
```

See [Job Source Integrations](docs/integrations/job-sources.md) for details.

## Local Validation

Run the full validation suite:

```bash
npm test
```

Equivalent manual checks:

```bash
node tests/validate/validate-skills.mjs
node support/validate/validate-job-sources.mjs
node support/validate/validate-job-schedule.mjs
node support/validate/validate-job-ranking.mjs
node tools/init-application.mjs --company demo --role backend --out .tmp-release-check --force
node support/validate/validate-application.mjs .tmp-release-check/demo-backend
node support/validate/validate-application.mjs examples/demo-new-grad-backend/applications/demo-cloud-backend
```

## Repository Structure

```txt
.
|-- AGENTS.md
|-- agent.md
|-- docs/
|   |-- assets/
|   |-- competitive-v1-roadmap.md
|   |-- integrations/
|   |-- npm-install.md
|   |-- platform-support.md
|   |-- quickstart.md
|   |-- release-checklist.md
|   `-- safety.md
|-- examples/
|-- skills/
|   |-- resume-intake/
|   |-- jd-analyzer/
|   |-- company-values-analyzer/
|   |-- cover-letter-writer/
|   |-- hr-reviewer/
|   |-- interview-prep/
|   `-- application-packager/
|-- templates/
|-- tests/
|-- tools/
`-- job-agent-plan.md
```

## Principles

- Do not invent experience, achievements, numbers, responsibilities, awards, or company names.
- Ground strong cover-letter claims in `resume.md`.
- Treat company values pages as optional context, not copyable text.
- Do not finalize text while HR review blockers remain.
- Never automate final submission, login, CAPTCHA bypass, email sending, or personal-information transmission.
