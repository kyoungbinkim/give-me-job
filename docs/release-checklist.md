# Release Checklist

Use this checklist before tagging a public release.

## Scope

- The release is positioned as an application package generator.
- The release is not described as an auto-apply or auto-submit tool.
- `README.md` and `docs/README-ko.md` describe the same workflow.
- `README.md` quickstart, skills list, and install goal are aligned with `docs/README-ko.md`.
- `docs/safety.md` lists allowed and disallowed actions.
- `docs/platform-support.md` documents Windows, Ubuntu/Linux, and macOS validation.
- The release runs with no API key, access token, or other issued credential, and no doc instructs the user to obtain one.

## Agent Compatibility

- `AGENTS.md` points full-workflow requests to `agent.md`.
- `agent.md` references the application-package workflow skills.
- Each skill has valid `SKILL.md` frontmatter.
- `node tests/validate/validate-skills.mjs` passes.
- `npm test` passes.
- Before public GitHub distribution, `skills.sh` installation has been manually checked from a clean project.
- `npm pack --dry-run` contains only intended repository files.
- `package.json` does not contain `private: true` before npm publishing.

## Package Workflow

- `node tools/init-application.mjs --company demo --role backend --out .tmp-release-check --force` creates a package.
- `node support/validate/validate-application.mjs .tmp-release-check/demo-backend` passes.
- `node support/validate/validate-job-schedule.mjs` passes.
- `node support/validate/validate-job-ranking.mjs` passes.
- Generated user packages remain ignored by Git.
- At least one checked-in demo package exists under `examples/`.

## Quality Gate

- Final cover letters require evidence-map rows.
- HR `Blocker` lines prevent final text validation.
- Manual submission reminders are present.
- The workflow never claims an application was submitted without user confirmation.

## Git

- Review `git status --short`.
- Review `git diff --stat`.
- Commit with a release-oriented message.
- Tag only after validation passes.
