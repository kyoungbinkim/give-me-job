# npm Install

Install `give-me-job` as reusable agent skills for Codex, OpenCode, and Claude Code.

## Quick Install

```bash
npx give-me-job install
```

This installs the six domain skills plus the `give-me-job` orchestrator agent for all supported agents in your user profile. The support bundle also includes `agent.md`, `tools/`, `templates/`, and validation fixtures so the local workflow tools are available after installation.

You can also install the CLI globally:

```bash
npm i -g give-me-job
give-me-job install
```

## Targets

Install every target:

```bash
give-me-job install --target all
```

Install one target:

```bash
give-me-job install --target codex
give-me-job install --target opencode
give-me-job install --target claude-code
```

User-scope install paths:

```txt
Codex:      ~/.agents/skills/<skill>/SKILL.md
Codex:      ~/.codex/agents/give-me-job.toml
OpenCode:   ~/.config/opencode/skills/<domain-skill>/SKILL.md
OpenCode:   ~/.config/opencode/agents/give-me-job.md
Claude Code: ~/.claude/skills/<domain-skill>/SKILL.md
Claude Code: ~/.claude/agents/give-me-job.md
```

The support bundle is installed under each target's `give-me-job` folder:

```txt
Codex:      ~/.codex/give-me-job/
OpenCode:   ~/.config/opencode/give-me-job/
Claude Code: ~/.claude/give-me-job/
```

Project-scope install paths:

```bash
give-me-job install --scope project --target all
```

```txt
Codex:      .agents/skills/<skill>/SKILL.md
Codex:      .codex/agents/give-me-job.toml
OpenCode:   .opencode/skills/<domain-skill>/SKILL.md
OpenCode:   .opencode/agents/give-me-job.md
Claude Code: .claude/skills/<domain-skill>/SKILL.md
Claude Code: .claude/agents/give-me-job.md
```

## Safety And Conflicts

The installer refuses to overwrite files whose content differs from the packaged version.

Use `--dry-run` to preview:

```bash
give-me-job install --dry-run
```

Use `--force` only when you want to replace an existing file. The installer writes a timestamped `.bak-*` backup first.

```bash
give-me-job install --target codex --force
```

Installed files are tracked in:

```txt
~/.give-me-job/install-manifest.json
```

`uninstall` removes only files recorded in that manifest and only when the file still matches the installed hash.

```bash
give-me-job uninstall --target all
```

## Doctor

Check installed skills:

```bash
give-me-job doctor
```

## Agent Safety Policy

The installed orchestrator prepares Korean job application packages only. It must not submit applications, log in to services, bypass CAPTCHA, send email, or transmit personal information. Review the generated files manually before submitting anything yourself.
