# give-me-job Repository Instructions

Use this repository as a job-application package generator, not as an automatic application submitter.

## Default Workflow

When the user asks to run the full workflow, says "give me job", or wants a complete company-specific application package:

1. Read `agent.md` first.
2. Use the six skills under `skills/` as the domain workflow steps.
3. Create or update one package under `applications/<company-role>/`.
4. Keep all strong cover-letter claims grounded in `resume.md`.
5. Stop when evidence is missing, HR review finds a blocker, or the next action would submit, send, log in, bypass CAPTCHA, or transmit personal information.

## Skill Routing

- Use `skills/resume-intake/SKILL.md` when `resume.md` is missing or weak.
- Use `skills/jd-analyzer/SKILL.md` for JD or hiring-post analysis.
- Use `skills/company-values-analyzer/SKILL.md` only when company values, culture, mission, or talent-profile material is provided.
- Use `skills/cover-letter-writer/SKILL.md` for Korean cover-letter drafts and evidence maps.
- Use `skills/hr-reviewer/SKILL.md` before any final text is prepared.
- Use `skills/application-packager/SKILL.md` to assemble the final package and manual submission checklist.

## Release Discipline

Before publishing or pushing release changes, run:

```bash
npm test
```

Equivalent manual checks:

```bash
node tools/validate-skills.mjs
node tools/init-application.mjs --company demo --role backend --out .tmp-release-check --force
node tools/validate-application.mjs .tmp-release-check/demo-backend
node tools/validate-job-sources.mjs
node tools/validate-job-schedule.mjs
node tools/validate-job-ranking.mjs
```

Do not commit generated user application packages under `applications/`.
