import os from "node:os";
import path from "node:path";
import { orchestratorSkillName } from "./skill-registry.mjs";

export const targets = ["codex", "opencode", "claude-code"];
export const scopes = ["user", "project"];

export const supportFiles = [
  "AGENTS.md",
  "agent.md",
  "support",
  "templates",
  "tools",
  "tests/fixtures/resume-new-grad.md",
  "tests/fixtures/jobs-normalized",
];

export const supportDirectories = new Set(["support", "templates", "tools", "tests/fixtures/jobs-normalized"]);
export const supportPackageEntries = supportFiles.map((entry) => (supportDirectories.has(entry) ? `${entry}/` : entry));

export const requiredSupportFiles = [
  "agent.md",
  "tools/fetch-jobs.mjs",
  "tools/job-sources/manual-url.mjs",
  "tools/init-application.mjs",
  "tools/normalize-job.mjs",
  "support/validate/validate-application.mjs",
  "templates/workflow-template.md",
  "tests/fixtures/resume-new-grad.md",
];

export function homeDir(options = {}) {
  return path.resolve(options.home ?? process.env.GIVE_ME_JOB_HOME ?? os.homedir());
}

export function manifestPath(options = {}) {
  return path.join(homeDir(options), ".give-me-job", "install-manifest.json");
}

export function skillRootFor(target, scope, options = {}) {
  const home = homeDir(options);
  const cwd = options.cwd ?? process.cwd();
  if (scope === "project") {
    if (target === "codex") return path.resolve(cwd, ".agents", "skills");
    if (target === "opencode") return path.resolve(cwd, ".opencode", "skills");
    return path.resolve(cwd, ".claude", "skills");
  }

  if (target === "codex") return path.join(home, ".agents", "skills");
  if (target === "opencode") return path.join(home, ".config", "opencode", "skills");
  return path.join(home, ".claude", "skills");
}

export function agentRootFor(target, scope, options = {}) {
  const home = homeDir(options);
  const cwd = options.cwd ?? process.cwd();
  if (scope === "project") {
    if (target === "codex") return path.resolve(cwd, ".codex", "agents");
    if (target === "opencode") return path.resolve(cwd, ".opencode", "agents");
    return path.resolve(cwd, ".claude", "agents");
  }

  if (target === "codex") return path.join(home, ".codex", "agents");
  if (target === "opencode") return path.join(home, ".config", "opencode", "agents");
  return path.join(home, ".claude", "agents");
}

export function toolRootFor(target, scope, options = {}) {
  if (target !== "opencode") {
    throw new Error(`Target does not have a custom tool root: ${target}`);
  }

  const home = homeDir(options);
  const cwd = options.cwd ?? process.cwd();
  if (scope === "project") return path.resolve(cwd, ".opencode", "tools");
  return path.join(home, ".config", "opencode", "tools");
}

export function targetConfigRootFor(target, scope, options = {}) {
  const home = homeDir(options);
  const cwd = options.cwd ?? process.cwd();
  if (scope === "project") {
    if (target === "codex") return path.resolve(cwd, ".codex");
    if (target === "opencode") return path.resolve(cwd, ".opencode");
    return path.resolve(cwd, ".claude");
  }

  if (target === "codex") return path.join(home, ".codex");
  if (target === "opencode") return path.join(home, ".config", "opencode");
  return path.join(home, ".claude");
}

export function supportRootFor(target, scope, options = {}) {
  return path.join(targetConfigRootFor(target, scope, options), orchestratorSkillName);
}

export function agentExtensionFor(target) {
  return target === "codex" ? "toml" : "md";
}

export function requiredSupportPathsFor(target, scope, options = {}) {
  const supportRoot = supportRootFor(target, scope, options);
  return requiredSupportFiles.map((relativePath) => path.join(supportRoot, relativePath));
}
