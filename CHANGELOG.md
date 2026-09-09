# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.9.1] - 2026-09-09

### Added

- Accept multiple user-supplied public HTTPS job pages with generic structured-data or readable-content extraction, and remove postings whose Seoul calendar deadline has passed from active job lists.

### Changed

- Improve the keyboard TUI with grouped navigation, contextual help, formatted results, narrow-terminal layout, and result scrolling.

### Security

- Bind each validated public DNS address to the corresponding HTTPS connection so user-supplied posting URLs cannot switch to a private address between validation and connection.

## [0.9.0] - 2026-09-09

The job search now lives in the same local workspace as the application
packages. Postings, the application package, submission tracking, and the
prompts handed back to the coding agent share one data directory and one
validation path, reachable from the CLI, a keyboard TUI, or a loopback web
dashboard. No API key, login, or automated submission is involved.

No breaking changes. `0.8.1` was never published to npm, so upgrading from
`0.8.0` also picks up that release's documentation fixes.

### Added

- Add the workspace commands `jobs import|list|refresh|rank`, `profile show|set`, `application prepare|validate`, `tracker list|update`, `digest`, `request`, `tui`, and `dashboard` to the `give-me-job` CLI, all operating on the same local data with `--workspace`, `--format json`, and `--input`/`--data`.
- Register postings from CSV, a URL list, or supplied JD text, keep every observation, and flag duplicate candidates and changed fields; a posting change marks the linked application package `review-blocked`.
- Add machine-readable package state (`state.json`, `review.json`) and a `ready` validation mode that ties each answer to resume evidence IDs, the evidence map, a completed HR review, input hashes, and the confirmed length rule before a package can reach `ready-for-user-review`.
- Add stage, schedule, and user-confirmed outcome tracking, plus a digest of new, changed, closing, and re-review items.
- Add a keyboard TUI and a local web dashboard bound to `127.0.0.1` with an Origin check on every action.
- Add the `workspace` workflow tool for installed agents. It runs `tools/workspace-cli.mjs`, which dispatches workspace actions only and cannot reach `install` or `uninstall`.
- Add `dashboard --timeout <ms>` so a non-interactive caller is not blocked waiting for a signal it cannot send.
- Add `docs/integrated-workflow.md` and `docs/agent-evaluation.md`, and the `test:workspace` suite covering package state, tracking, and the integrated CLI, TUI, and dashboard.

### Changed

- `support/validate/validate-application.mjs` now delegates to `validateApplication` with an explicit `structure` or `ready` mode. Structure mode keeps the package consistency gate: final text requires a non-empty HR review, evidence rows, and no unresolved blockers, and `workflow.md` field values must be supported.
- Workspace commands exit non-zero when validation reports a failure, so a script gating on the exit code no longer treats a blocked package as validated.
- `jobs refresh` skips manually entered postings that have no public URL instead of marking them unverifiable, and an import keeps the other columns a CSV row supplied for a fetched posting.
- Reading the job store tolerates a malformed stored URL, and "latest wins" is decided by observation timestamp alone.

## [0.8.1] - 2026-08-26

Documentation fix release. The packaged quickstart told users to run a bare
`give-me-job doctor` immediately after `npx give-me-job install`, which fails
because `npx` does not put a `give-me-job` binary on `PATH`. Anyone following
the quickstart hit `command not found` on their second command.

No code, API, or install-behavior changes. Reinstall only if you want the
corrected packaged documentation.

### Fixed

- Prefix the `doctor` command in `docs/quickstart.md` with `npx`, and explain that `npx` provides no `PATH` binary while `npm i -g give-me-job` does.

### Added

- Add an "Is This For You?" section to `README.md` and matching "왜 만들었나" and "이런 분께 맞습니다" sections to `docs/README-ko.md`, stating the Node.js and coding-agent requirement before install rather than after it.
- Link the checked-in demo application package near the top of both READMEs so output can be reviewed before installing.

## [0.8.0] - 2026-08-22

User-supplied public posting URLs can now enter the application workflow
without an API key, login, or browser automation. Automated job discovery and
application submission remain out of scope.

No breaking changes. Reinstall to pick up the URL intake adapter and updated
agent tools.

### Added

- Normalize user-supplied public JobKorea, Linkareer, SK Careers, and LG Careers detail URLs through `fetch-jobs --source url --url <posting-url>` without credentials.
- Preserve extracted posting text, positions, application questions, attachments, application URL, and extraction warnings in the normalized job's `raw` fields.
- Add fixture validation for all four supported posting layouts.

### Changed

- Route supported posting URLs through the full agent workflow and stop for an exact role, missing application questions, or unreadable attachment content instead of guessing.

## [0.7.0] - 2026-08-10

Claude Code users can now install the domain skills as a plugin without npm.
This release also fixes a triggering defect: three skills in a Korea-only
product had English-only descriptions, so Korean requests did not reliably
reach them.

No breaking changes. The npm installer, CLI flags, and install paths are
unchanged.

### Added

- Add `SECURITY.md` with a private reporting path, a threat model scoped to the local CLI and personal data, and the guardrails the validation suite enforces.
- Add `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` so Claude Code users can install the domain skills with `/plugin marketplace add` instead of npm.
- Validate the plugin manifests: both must parse, `plugin.json` name and version must match `package.json`, and each marketplace entry's source must contain `skills/`.

### Fixed

- Add Korean trigger phrases to the `resume-intake`, `jd-analyzer`, and `company-values-analyzer` descriptions, and fail validation on an English-only description. A Korea-only product's skills could not be triggered by Korean requests such as `이력서 정리해줘` or `공고 분석해줘`.
- Document that OpenCode also scans `~/.claude/skills` and `~/.agents/skills`, so the install targets are not isolated and `--target all` exposes each skill to OpenCode under three roots.

## [0.6.1] - 2026-08-07

Cover-letter guidance is now split by career type. New graduates and
experienced hires are screened on different questions, and career type
previously changed only two lines of drafting structure. Answers for
experienced candidates also gain 이직 사유 handling, which the project did not
cover at all.

No CLI, installer, or tool behavior changes. Reinstall to pick up the updated
skills.

### Added

- Add `references/career-type-playbooks.md`, splitting cover-letter guidance into separate new-grad and experienced playbooks with an explicit career-type resolution step. Career type previously changed only two lines of drafting structure.
- Add `Reason For Changing Jobs` and short-tenure guidance, plus a `Job Change` question type. 이직 사유 had no coverage anywhere in the project.
- Add a `Failure And Exception Behavior` contract to `cover-letter-writer`, covering unresolvable career type, missing facts, ambiguous questions, and requests to overstate or criticize a former employer.
- Add `Failure And Mistake Answers` guidance for 실패 경험 and 성장과정 questions, covering owned decisions, honest cause, and the change afterward.
- Add `Sub-Role Awareness` guidance so answers target the narrowest role scope a posting names instead of the job family in its title.
- Capture decision rationale during resume intake, and probe alternatives considered during interview prep, so decision quality survives into the package.

### Changed

- Add HR-review blockers for wrong sub-role residue and disqualifying failure disclosures, plus warnings for blame-shifted causes, fake weaknesses, adjacent-domain evidence, and result-only answers to reasoning questions.
- Add HR-review blockers for fabricated employment-history facts and previous-employer criticism, and review each draft through its career type's lens rather than one shared standard.
- Document the development loop, the real command set, and the six validator-enforced constraints in `AGENTS.md`, and record that terminal output outranks a conflicting document.
- Describe career-type handling in `README.md` and add a `경력 유형별 작성` section to `docs/README-ko.md`. Neither README mentioned new-grad or experienced handling at all.
- Record `Career Type` in `workflow.md` and the cover-letter template, and validate the value in `validate-application.mjs` the same way `Status` and `Job Function` are validated.
- Add the new blocker classes to `docs/safety.md`, and note career-type resolution in the quickstart, the release checklist, and the demo example.

## [0.6.0] - 2026-08-07

Automated job discovery is removed in this release and job sourcing is now a
TODO. `give-me-job` no longer requires an API key, access token, or any other
issued credential, and no tool reads a `.env` file.

Upgrading from `0.5.x`: `node tools/fetch-jobs.mjs --source saramin|work24|jobkorea`
no longer works and exits with a TODO message, because no source is registered.
Supply a posting URL or JD text manually instead. The rest of the workflow —
resume intake, JD analysis, cover-letter drafting, HR review, interview prep,
packaging, deadline scheduling, and fit ranking — is unchanged. Reinstalling
removes the `.env.example` left in the support bundle by earlier versions.

### Removed

- Remove the jobkorea, saramin, and work24 job-source adapters, their fixtures, and `validate-job-sources.mjs`. Automated job sourcing is now a TODO.
- Remove `.env.example` and `tools/env.mjs`. The project no longer reads a `.env` file or any API key, access token, or other issued credential.
- Remove the Bash grant the installer injected into the Claude Code `job-searcher` skill. The skill only guides intake, so it now installs with `allowed-tools: Read, Grep`.

### Changed

- Turn `tools/fetch-jobs.mjs` into a placeholder with an empty source registry so a normalized adapter can be added later.
- Rewrite the `job-searcher` skill to guide users to provide a JD or posting URL manually while automated search is unavailable.
- Rewrite the credentialed sections of the competitive v1 roadmap around credential-free job intake, and mark the `v0.2` adapter milestone as reverted.
- Document the no-credential rule as a contribution and release requirement.

### Fixed

- Drop references to the deleted `support/validate/validate-job-sources.mjs` from `AGENTS.md`, `CONTRIBUTING.md`, `docs/platform-support.md`, and `docs/release-checklist.md`.
- Correct the `docs/npm-install.md` description of the generated Claude Code `allowed-tools` line, which is scoped per script rather than a blanket `Bash` grant.
- List `job-searcher`, `support/`, and `bin/` in the README repository structure, and align the Korean README install paths with the English README.

### Added

- Fail skill validation if `.env.example` or `tools/env.mjs` is reintroduced.
- Remove a previously installed `.env.example` from the support bundle on upgrade, so a stale credential template does not linger. Locally modified copies are left untouched, as with other managed files.
- Replace the release-checklist item for the nonexistent `skills.sh` with the `npm run test:install` gate that actually covers installation.

## [0.5.4] - 2026-06-24

### Added

- Add OpenCode generated-tool policy validation so installed workflow tools must match their source allowlists.
- Add Korean UTF-8 phrase validation for core docs and skills.
- Add job-ranking regression checks for representative backend, rolling, expired, and business-planning fixtures.

### Changed

- Broaden job fit ranking from backend-only matching to job-function profiles for tech, business, support, creative, and operations roles.
- Strengthen `cover-letter-writer` guidance for question relevance, company specificity, blind hiring, natural Korean phrasing, and company-name residue checks.

### Fixed

- Allow safe Saramin search flags in the generated OpenCode `fetch-jobs` tool policy.
- Match `new-grad` resumes against Korean `신입` postings and `Seoul, Korea` preferences against `서울` job locations.

## [0.5.0] - 2026-06-15

### Added

- Add `interview-prep` skill and package output for evidence-grounded interview defense questions.
- Add an LG Electronics backend full-workflow example test using the existing demo candidate and official talent-page values.

### Changed

- Add skill contracts, autonomy levels, and trigger guidance across the domain skills.
- Strengthen deterministic HR review blocker criteria and cover-letter length/type controls.
- Move public validation commands from `tools/validate-*` to `support/validate/` and keep release-only checks under `tests/validate/`.
- Narrow the npm package allowlist so dev-only workflow tests and draft examples are excluded from the published tarball.

## [0.4.6] - 2026-06-11

### Fixed

- Upgrade installer-managed files without requiring `--force` and remove managed legacy `give-me-job` orchestrator skill files after agent migration.

## [0.4.5] - 2026-06-11

### Fixed

- Install `give-me-job` as a Codex custom agent and Claude Code subagent instead of an orchestrator skill.

## [0.4.4] - 2026-06-11

### Fixed

- Install `give-me-job` as an OpenCode agent at `~/.config/opencode/agents/give-me-job.md` instead of an OpenCode skill.
- Add npm package repository metadata required for GitHub trusted publishing.

## [0.4.3] - 2026-06-11

### Fixed

- Install the full `give-me-job` support bundle with the orchestrator skill, including `agent.md`, `tools/`, `templates/`, and test fixtures needed by local validation tools.

## [0.4.2] - 2026-06-11

### Fixed

- Point the npm executable to a `.js` shim for reliable `npx give-me-job` resolution.

## [0.4.1] - 2026-06-11

### Fixed

- Use an extensionless npm bin shim so `npx give-me-job` installs the CLI executable.

## [0.4.0] - 2026-06-11

### Added

- npm installer CLI with `install`, `uninstall`, and `doctor` commands.
- User and project-scope skill installation for Codex, OpenCode, and Claude Code.
- Installer validation covering dry-run, conflicts, force backups, uninstall, and Windows paths.
- npm installation documentation.
- GitHub Actions CI across Node.js 18, 20, and 22.
- MIT license metadata and repository license file.
- GitHub issue templates for bug reports and feature requests.
- npm publishing metadata with an explicit package `files` allowlist.

### Changed

- Application validation now rejects unknown workflow status values.

## [0.3.1] - 2026-06-11

### Added

- Cross-platform validation support for Windows PowerShell, Ubuntu/Linux, and macOS.
- Job deadline scheduling validation.
- Job ranking validation.

### Fixed

- Path display compatibility for local validation output.

## [0.3.0] - 2026-06-11

### Added

- `schedule-jobs.mjs` for deadline-focused job scheduling.
- `rank-jobs.mjs` for JD and resume fit scoring.

## [0.2.0] - 2026-06-11

### Added

- Korean job-source adapters for Saramin, Work24, and JobKorea.
- Normalized job schema and checked-in API fixtures.
- `.env.example` for approved API access configuration.

## [0.1.0] - 2026-06-11

### Added

- Initial six-skill agent workflow.
- `agent.md` orchestrator.
- Repository instructions in `AGENTS.md`.
