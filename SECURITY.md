# Security Policy

## Supported Versions

Only the latest published version receives fixes. Upgrade before reporting.

```bash
npm i -g give-me-job@latest
give-me-job doctor
```

## Reporting a Vulnerability

Report privately through
[GitHub Security Advisories](https://github.com/kyoungbinkim/give-me-job/security/advisories/new).
Do not open a public issue for a vulnerability.

Include the version, your platform, the affected command or skill, and the
smallest reproduction you can produce. **Never paste a real resume, a real
application package, or anyone's personal information into a report.** Use the
fixtures under `tests/fixtures/` or invented data.

## Threat Model

This project is a local CLI and a set of agent skill files. It has no server,
no runtime npm dependencies, and no account system. The realistic risks are
about the local filesystem and about personal data.

In scope:

- The installer writing outside its documented install paths, or overwriting
  files it does not own.
- The workflow tools reading or writing outside the working directory, or
  path traversal through a flag such as `--out` or `--fixture`.
- The generated OpenCode tool definitions accepting flags outside their
  declared allowlist.
- Personal data leaving the machine, or being written to a path that is not
  git-ignored.
- Anything that would cause a credential to be required, read, or stored. This
  project deliberately uses none.

Out of scope:

- The quality, tone, or persuasiveness of generated Korean cover-letter text.
- An agent declining to act because a safety rule in `docs/safety.md` fired.
  That is intended behavior, not a vulnerability.
- Behavior after a user manually edits files inside an install directory.

## Data Handling

`give-me-job` processes resumes, job postings, and application drafts. All of
it stays on the local machine.

- Nothing is transmitted. The tools make no network requests.
- No API key, access token, or other issued credential is used or read, and
  `.env.example` and `tools/env.mjs` are blocked from returning by
  `tests/validate/validate-skills.mjs`.
- Personal output stays under git-ignored paths: `applications/`, `data/`, and
  `.tmp-*`.
- The orchestrator must not submit an application, log in, bypass CAPTCHA, send
  email, or transmit personal information. See
  [docs/safety.md](docs/safety.md).

If you find a path where personal data is written outside those ignored
directories, or is included in the published npm tarball, report it as a
vulnerability.

## Guardrails In The Code

These are enforced and covered by the validation suite:

- Installed files are tracked by SHA-256 in
  `~/.give-me-job/install-manifest.json`. The installer refuses to overwrite a
  file whose content differs from the packaged version unless `--force` is
  passed, and it writes a timestamped `.bak-*` backup first.
- `uninstall` removes only manifest-tracked files whose hash still matches, so
  a locally modified file is never deleted.
- Generated OpenCode tools validate every argument against a per-tool flag
  allowlist and reject path flags that resolve outside the workspace.
- Claude Code tool skills declare a scoped `allowed-tools` line permitting Bash
  only for their own script, not general shell access.

## Publishing

Releases are published from CI on a `v*.*.*` tag with npm provenance. The
package `files` allowlist is enforced by `tests/validate/validate-skills.mjs`,
which fails if a dev-only path would be published.
