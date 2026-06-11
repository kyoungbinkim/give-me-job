# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
