# give-me-job

![give-me-job banner](docs/assets/give-me-job-banner.jpg)

`give-me-job` is an AI agent toolkit for Korean job applications. It helps you turn scattered career notes, a Korean job post, and company context into a focused application package: JD analysis, evidence-grounded 자기소개서 drafts, HR risk review, interview defense, and a manual submission checklist.

Most job-application tools optimize for speed. `give-me-job` optimizes for confidence: every strong claim should trace back to your `resume.md`, every risky sentence gets reviewed before final use, and every final answer should be something you can defend in an interview.

Use it when you want an agent to help with 취업준비 without inventing experience, exaggerating metrics, or auto-submitting applications. The current demo focuses on a backend role, but the workflow is designed for Korean job applications across tech, business, support, creative, and operations roles. This repository prepares the materials; you stay in control of review and final submission.

Korean search keywords: 자기소개서, 취업준비, 한국 취업, 취업 에이전트, 개발자 취업준비, 개발자 자기소개서.

Use [`agent.md`](agent.md) as the orchestrator for the full workflow. Repository-level agent instructions are in [`AGENTS.md`](AGENTS.md). Korean documentation is available at [`docs/README-ko.md`](docs/README-ko.md).

**See the output before you install** — a complete demo application package is committed to this repository:
[`examples/demo-new-grad-backend/applications/demo-cloud-backend/`](examples/demo-new-grad-backend/applications/demo-cloud-backend/)

## Is This For You?

**A good fit**

- You are applying to Korean companies and already use a coding agent (Claude Code, Codex, or OpenCode).
- You have a resume or portfolio, and the hard part is turning it into 자기소개서 sentences you can defend.
- You want the cover letter reviewed before submission, not written faster.

**Not a fit yet**

- You do not use a terminal. This currently needs Node.js `18.17`+ and a coding agent. A desktop app is planned but not released.
- You want automated mass applying. This toolkit refuses to submit, log in, send email, or bypass CAPTCHA by design.
- You want the agent to fill gaps in your experience. It stops and asks instead of inventing.

## Features

- Resume evidence intake: structure user-provided career facts into reusable `resume.md` evidence.
- JD analysis: extract role requirements, evaluation criteria, keywords, gaps, and risks from Korean job posts.
- Company-values analysis: use optional mission, culture, values, or talent-profile material for positioning.
- Korean cover-letter drafting: write answers grounded in `resume.md`, JD analysis, and optional company context.
- Career-type playbooks: new graduates and experienced hires are drafted and reviewed against different criteria, including 이직 사유 and short-tenure handling for experienced candidates.
- HR review: check exaggeration, unsupported claims, company-name residue, wrong sub-role targeting, and pre-submission blockers.
- Interview preparation: generate follow-up questions and evidence-backed answer points for interview defense.
- Application packaging: create one `applications/<company-role>/` package with a manual checklist.
- Job-source tools: normalize user-supplied public JobKorea, Linkareer, SK Careers, and LG Careers URLs, then schedule or rank the saved jobs. Automated discovery remains a TODO.
- No credentials: nothing here needs an API key, access token, or approved API access.

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
| [Job Source Integrations](docs/integrations/job-sources.md) | Manual URL intake support and automated discovery status |

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

This installs the eight domain skills plus the `give-me-job` orchestrator agent for supported coding agents in your user profile. The support bundle includes `agent.md`, `tools/`, `templates/`, and validation fixtures. Claude Code also gets tool-shaped skills such as `give-me-job-fetch-jobs`; OpenCode also gets custom tool definitions under its tools directory.

You can also install the CLI globally:

```bash
npm i -g give-me-job
give-me-job install
```

Claude Code users can add the domain skills as a plugin instead, without npm:

```txt
/plugin marketplace add kyoungbinkim/give-me-job
/plugin install give-me-job
```

The plugin route installs the domain skills only. The npm installer additionally
writes the `give-me-job` orchestrator agent, the tool-shaped workflow skills,
and the support bundle (`agent.md`, `tools/`, `templates/`, fixtures), which the
full workflow needs. Use `npx give-me-job install` for the complete setup.

Without `--target`, the installer asks which AI agent to install to. Use the arrow keys to choose `codex`, `claude`, `opencode`, or `all`.

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

These paths match the official discovery locations for Codex, Claude Code, and OpenCode skills and agents.

Default user-scope install paths:

```txt
Codex:       ~/.agents/skills/<skill>/SKILL.md
Codex:       ~/.codex/agents/give-me-job.toml
Codex:       ~/.codex/give-me-job/

OpenCode:    ~/.config/opencode/skills/<domain-skill>/SKILL.md
OpenCode:    ~/.config/opencode/agents/give-me-job.md
OpenCode:    ~/.config/opencode/tools/give_me_job_<tool>.js
OpenCode:    ~/.config/opencode/give-me-job/

Claude Code: ~/.claude/skills/<domain-skill>/SKILL.md
Claude Code: ~/.claude/skills/give-me-job-<tool>/SKILL.md
Claude Code: ~/.claude/agents/give-me-job.md
Claude Code: ~/.claude/give-me-job/
```

Project-scope install paths:

```txt
Codex:       .agents/skills/<skill>/SKILL.md
Codex:       .codex/agents/give-me-job.toml

OpenCode:    .opencode/skills/<domain-skill>/SKILL.md
OpenCode:    .opencode/agents/give-me-job.md
OpenCode:    .opencode/tools/give_me_job_<tool>.js

Claude Code: .claude/skills/<domain-skill>/SKILL.md
Claude Code: .claude/skills/give-me-job-<tool>/SKILL.md
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
- `cover-letter-writer`: drafts Korean cover-letter answers grounded in evidence, using the new-grad or experienced playbook for the candidate's career type.
- `hr-reviewer`: checks application materials from an HR risk perspective, applying the criteria that match the candidate's career type.
- `interview-prep`: prepares interview follow-up questions and answer points grounded in evidence.
- `application-packager`: assembles the company-specific package and manual submission checklist.
- `job-searcher`: normalizes supported public posting URLs and guides manual intake while automated discovery remains a TODO.

## Job Sources And Prioritization

Automated job discovery is a **TODO**, but a user-supplied public posting URL can
be normalized without credentials:

```bash
node tools/fetch-jobs.mjs --source url --url "https://careers.lg.com/apply/detail?id=1002029"
```

The URL source supports JobKorea, Linkareer, SK Careers, and LG Careers detail
pages. It saves the normalized record under `data/jobs/YYYY-MM-DD/`. Public
pages often omit application questions or put detailed duties in an attachment;
the agent stops and asks for those missing inputs instead of guessing.

`give-me-job` requires no API key, access token, or other issued credential, and
none of its tools read one. Any future job source must work the same way.

Once normalized jobs exist under `data/jobs/`, check deadlines and fit ranking:

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
|-- bin/
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
|   |-- application-packager/
|   `-- job-searcher/
|-- support/
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
