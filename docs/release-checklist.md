# Release Checklist

Use this checklist before tagging a public release.

## Scope

- The release is positioned as an application package generator.
- The release is not described as an auto-apply or auto-submit tool.
- `README.md` and `docs/README-ko.md` describe the same workflow.
- `docs/safety.md` lists allowed and disallowed actions.

## Agent Compatibility

- `AGENTS.md` points full-workflow requests to `agent.md`.
- `agent.md` references all six skills.
- Each skill has valid `SKILL.md` frontmatter.
- `node tools/validate-skills.mjs` passes.

## Package Workflow

- `node tools/init-application.mjs --company demo --role backend --out .tmp-release-check --force` creates a package.
- `node tools/validate-application.mjs .tmp-release-check/demo-backend` passes.
- `node tools/validate-job-sources.mjs` passes.
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
