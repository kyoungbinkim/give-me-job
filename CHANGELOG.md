# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
