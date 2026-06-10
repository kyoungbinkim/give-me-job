# give-me-job

`give-me-job` is a job-search assistant skill collection for coding agents such as Codex CLI, Claude Code, and OpenCode.

The project is designed as a `skills.sh`-compatible repository. Its first goal is not a web app or a custom npm CLI, but a set of reusable agent skills that help candidates structure career evidence, analyze job descriptions, write evidence-based cover letters, and prepare application packages safely.

For full application preparation, use [`agent.md`](agent.md) as the orchestrator. It runs the six skills in order and creates one company-specific package under `applications/<company-role>/`.

Repository-level agent discovery is provided by [`AGENTS.md`](AGENTS.md). Generated user packages under `applications/` are ignored by Git.

Korean documentation is available at [docs/README-ko.md](docs/README-ko.md).

## Workflow

The workflow has two layers:

- `agent.md`: end-to-end orchestration for one application package.
- `skills/*`: reusable domain skills used by the orchestrator.

```txt
+---------------------+
| JD URL / JD text    |
+----------+----------+
           |
           v
+----------+----------+        missing or weak
| agent.md intake     | --------------------+
+----------+----------+                     |
           |                                v
           v                         +------+------+
+----------+----------+              | resume-     |
| existing resume.md  | <----------- | intake      |
| evidence source     |              +------+------+
+----------+----------+                     |
           |                                v
           |                         +------+------+
           |                         | resume.md   |
           |                         +-------------+
           v
+----------+----------+
| jd-analyzer         |
+----------+----------+
           |
           v
+----------+----------+        optional
| JD analysis         | <---------------------+
+----------+----------+                       |
           |                                  |
           v                                  |
+----------+----------+              +--------+--------+
| cover-letter-writer | <----------- | company-values |
| draft + evidence    |              | analyzer       |
+----------+----------+              +----------------+
           |
           v
+----------+----------+
| hr-reviewer         |
| risk and evidence   |
+----------+----------+
           |
           v
+----------+----------+
| application-        |
| packager            |
+----------+----------+
           |
           v
+----------+----------+
| applications/       |
| <company-role>/     |
+----------+----------+
           |
           v
User reviews and submits manually
```

The orchestrator stops when required inputs are missing, when `resume.md` does not support a strong claim, or when the next action would submit, send, log in, bypass CAPTCHA, or transmit personal information.

## End-To-End Agent

Use `agent.md` when the user wants one complete application workflow. The agent creates this package shape:

```txt
applications/
└── <company-role>/
    ├── workflow.md
    ├── jd-analysis.md
    ├── company-values.md
    ├── cover-letter-draft.md
    ├── hr-review.md
    ├── cover-letter-final.md
    ├── evidence-map.md
    └── submission-checklist.md
```

Example requests:

```txt
give me job: use resume.md and this JD to prepare the full package
전체 워크플로우 실행해서 카카오 백엔드 지원 패키지 만들어줘
공고 URL과 인재상 페이지를 보고 자소서 초안, HR 리뷰, 제출 체크리스트까지 만들어줘
```

`agent.md` is intentionally not a submitter. It prepares files and checklists only.

## Quickstart

Validate the repository:

```bash
node tools/validate-skills.mjs
```

Create a local application package:

```bash
node tools/init-application.mjs --company kakao --role backend
```

Ask your coding agent to read `agent.md` and fill the package with your `resume.md` and JD. Then validate the package:

```bash
node tools/validate-application.mjs applications/kakao-backend
```

See [docs/quickstart.md](docs/quickstart.md), [docs/safety.md](docs/safety.md), and [docs/release-checklist.md](docs/release-checklist.md).

## Skills

- `resume-intake`: Creates and improves `resume.md` by turning raw career input into structured evidence.
- `jd-analyzer`: Extracts role requirements, hidden evaluation criteria, keywords, and gaps from a JD or hiring post.
- `company-values-analyzer`: Analyzes optional company values, talent profiles, culture pages, or pasted text.
- `cover-letter-writer`: Writes Korean cover letter drafts grounded in `resume.md`, JD analysis, and optional company values.
- `hr-reviewer`: Reviews resumes, cover letters, evidence maps, and application packages from an HR perspective.
- `application-packager`: Creates company-specific application packages and pre-submission checklists.

## Install Goal

After distribution validation, the target install flow is:

```bash
npx skills add kyoungbinkim/give-me-job --list
npx skills add kyoungbinkim/give-me-job@cover-letter-writer
npx skills add kyoungbinkim/give-me-job --agent codex claude-code opencode
```

While this repository is private, `skills.sh` validation that assumes public GitHub access may fail. Before public distribution, decide whether to make this repository public or publish a separate public skills repository.

For local testing in Codex, copy the skill folders into your Codex skills directory:

```txt
~/.codex/skills/
```

Restart Codex after installing local skills.

## Local Validation

```bash
node tools/validate-skills.mjs
node tools/init-application.mjs --company demo --role backend --out .tmp-release-check --force
node tools/validate-application.mjs .tmp-release-check/demo-backend
node tools/validate-application.mjs examples/demo-new-grad-backend/applications/demo-cloud-backend
```

The validator checks:

- root `AGENTS.md` repository instruction presence
- root `agent.md` orchestrator presence
- expected six skill folders
- required `SKILL.md` files
- YAML frontmatter with only `name` and `description`
- folder name and skill name consistency
- banned auxiliary docs inside skill folders
- core `resume.md` evidence rules in the relevant skills
- release docs, package templates, and workflow helper scripts

## Repository Structure

```txt
.
├── AGENTS.md
├── agent.md
├── docs/
│   ├── quickstart.md
│   ├── release-checklist.md
│   └── safety.md
├── examples/
├── skills/
│   ├── resume-intake/
│   ├── jd-analyzer/
│   ├── company-values-analyzer/
│   ├── cover-letter-writer/
│   ├── hr-reviewer/
│   └── application-packager/
├── templates/
├── tests/
│   ├── fixtures/
│   └── golden/
├── tools/
│   ├── init-application.mjs
│   ├── validate-application.mjs
│   └── validate-skills.mjs
└── job-agent-plan.md
```

## Principles

- Do not invent experience, achievements, numbers, responsibilities, awards, or company names.
- Write cover letters from `resume.md` evidence.
- Treat company values pages as optional context, not text to copy.
- Link strong claims to concrete evidence.
- Prefer safe application preparation over automated submission.
- Never trigger final submission without explicit user action.
