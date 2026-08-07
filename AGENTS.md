# give-me-job Repository Instructions

Use this repository as a Korea-only job-application package generator, not as an automatic application submitter.

## Default Workflow

When the user asks to run the full workflow, says "give me job", or wants a complete company-specific application package for the Korean hiring market:

1. Read `agent.md` first.
2. Use the application workflow skills under `skills/` as the domain workflow steps.
3. Create or update one package under `applications/<company-role>/`.
4. Keep all strong cover-letter claims grounded in `resume.md`.
5. Stop when evidence is missing, HR review finds a blocker, or the next action would submit, send, log in, bypass CAPTCHA, or transmit personal information.
6. Treat non-Korean hiring workflows as out of scope unless the user explicitly asks to adapt the repository later.

## Skill Routing

- Use `skills/resume-intake/SKILL.md` when `resume.md` is missing or weak.
- Use `skills/jd-analyzer/SKILL.md` for JD or hiring-post analysis.
- Use `skills/company-values-analyzer/SKILL.md` only when company values, culture, mission, or talent-profile material is provided.
- Use `skills/cover-letter-writer/SKILL.md` for Korean cover-letter drafts and evidence maps.
- Use `skills/hr-reviewer/SKILL.md` before any final text is prepared.
- Use `skills/interview-prep/SKILL.md` after draft/final text exists to prepare evidence-grounded interview defense.
- Use `skills/application-packager/SKILL.md` to assemble the final package and manual submission checklist.

## Working On This Repository

The sections above describe using this repository to produce an application
package. This section describes changing the repository itself.

### Development Loop

1. **Explore.** Read the affected files and their callers before editing. Docs
   in this repository have drifted from the code before, so confirm that a
   script or path a document mentions actually exists.
2. **Plan.** Identify every file the change touches, including validators and
   packaging lists. Keep each commit atomic.
3. **Edit.** Make the smallest diff that does the job. Do not reformat
   untouched lines, delete comments you were not asked to remove, or rename
   things opportunistically.
4. **Verify.** Run the checks below and fix failures before committing. If a
   check fails, read the actual error before changing the approach.

When a guideline in any document conflicts with the repository's real state,
trust the terminal output and fix the document.

### Commands

This repository has no lint step and no build step. Do not invent one.

```bash
npm test            # full suite; the default gate for any change
npm run test:skills # skill contracts, packaging lists, and release files only
npm run test:jobs   # schedule and ranking fixtures only
npm run test:install # installer: install, upgrade, conflict, force, uninstall
npm run test:release # npm test + test:install; what publishing runs
```

Run `npm run test:install` whenever you touch `tools/install-*.mjs`,
`tools/skill-registry.mjs`, `tools/give-me-job-cli.mjs`, or the `files` list in
`package.json`. `npm test` alone does not cover the installer.

### Repository-Specific Constraints

These are enforced by validators and will fail the suite:

- `SKILL.md` frontmatter accepts only `name` and `description`. Any other field
  is rejected. Install-time additions such as `allowed-tools` are injected by
  `tools/install-adapters.mjs`, not written into the source file.
- A skill's `description` must be at least 120 characters.
- Validation scripts must not live in `tools/`. Public checks go in
  `support/validate/`, release-only checks in `tests/validate/`.
- A new workflow tool's flag allowlist in `tools/install-adapters.mjs` must
  match the generated OpenCode tool policy exactly.
- Adding a file to the support bundle means updating `supportFiles` in
  `tools/install-layout.mjs` and `files` in `package.json` together.
- No API key, access token, or other issued credential. `.env.example` and
  `tools/env.mjs` are blocked from returning.

### Do Not Edit

- `applications/`, `data/`, and `.tmp-*` directories. These are generated and
  git-ignored.
- `.github/workflows/publish.yml` release triggers without saying so. Pushing a
  `v*.*.*` tag publishes to npm, and a published version cannot be reused.

## Release Discipline

Before publishing or pushing release changes, run:

```bash
npm test
```

Equivalent manual checks:

```bash
node tests/validate/validate-skills.mjs
node tools/init-application.mjs --company demo --role backend --out .tmp-release-check --force
node support/validate/validate-application.mjs .tmp-release-check/demo-backend
node support/validate/validate-job-schedule.mjs
node support/validate/validate-job-ranking.mjs
```

Do not commit generated user application packages under `applications/`.
