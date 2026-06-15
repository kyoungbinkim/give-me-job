#!/usr/bin/env node
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readdir, readFile, rm, rmdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toPosixPath } from "./platform.mjs";
import { allSkillNames, orchestratorSkillName, skillNames } from "./skill-registry.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = ["codex", "opencode", "claude-code"];
const agentName = "give-me-job";
const agentDescription =
  "Run the Korea-only give-me-job application workflow. Use when preparing a company-specific Korean job application package from resume.md, a JD, and optional company values while never submitting, logging in, bypassing CAPTCHA, or transmitting personal information.";
const supportFiles = [
  ".env.example",
  "AGENTS.md",
  "agent.md",
  "support",
  "templates",
  "tools",
  path.join("tests", "fixtures", "saramin-job-search.json"),
  path.join("tests", "fixtures", "work24-jobs.xml"),
  path.join("tests", "fixtures", "jobkorea-jobs.xml"),
  path.join("tests", "fixtures", "resume-new-grad.md"),
  path.join("tests", "fixtures", "jobs-normalized"),
];

function usage() {
  return `Usage:
give-me-job install [--target all|codex|opencode|claude-code] [--scope user|project] [--force] [--dry-run]
give-me-job uninstall [--target all|codex|opencode|claude-code] [--scope user|project] [--dry-run]
give-me-job doctor [--target all|codex|opencode|claude-code] [--scope user|project]

Defaults: install --target all --scope user
`;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) {
      args._.push(current);
      continue;
    }

    const [rawKey, inlineValue] = current.slice(2).split("=", 2);
    const next = argv[i + 1];
    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue;
    } else if (!next || next.startsWith("--")) {
      args[rawKey] = true;
    } else {
      args[rawKey] = next;
      i += 1;
    }
  }
  return args;
}

function homeDir() {
  return path.resolve(process.env.GIVE_ME_JOB_HOME || os.homedir());
}

function manifestPath() {
  return path.join(homeDir(), ".give-me-job", "install-manifest.json");
}

function expandTargets(value) {
  const raw = String(value ?? "all")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const expanded = raw.includes("all") ? targets : raw;
  for (const target of expanded) {
    if (!targets.includes(target)) {
      throw new Error(`Unknown target: ${target}`);
    }
  }
  return [...new Set(expanded)];
}

function normalizeScope(value) {
  const scope = String(value ?? "user");
  if (!["user", "project"].includes(scope)) {
    throw new Error(`Unknown scope: ${scope}`);
  }
  return scope;
}

function skillRootFor(target, scope) {
  const home = homeDir();
  if (scope === "project") {
    if (target === "codex") return path.resolve(process.cwd(), ".agents", "skills");
    if (target === "opencode") return path.resolve(process.cwd(), ".opencode", "skills");
    return path.resolve(process.cwd(), ".claude", "skills");
  }

  if (target === "codex") return path.join(home, ".agents", "skills");
  if (target === "opencode") return path.join(home, ".config", "opencode", "skills");
  return path.join(home, ".claude", "skills");
}

function agentRootFor(target, scope) {
  const home = homeDir();
  if (scope === "project") {
    if (target === "codex") return path.resolve(process.cwd(), ".codex", "agents");
    if (target === "opencode") return path.resolve(process.cwd(), ".opencode", "agents");
    return path.resolve(process.cwd(), ".claude", "agents");
  }

  if (target === "codex") return path.join(home, ".codex", "agents");
  if (target === "opencode") return path.join(home, ".config", "opencode", "agents");
  return path.join(home, ".claude", "agents");
}

function targetConfigRootFor(target, scope) {
  const home = homeDir();
  if (scope === "project") {
    if (target === "codex") return path.resolve(process.cwd(), ".codex");
    if (target === "opencode") return path.resolve(process.cwd(), ".opencode");
    return path.resolve(process.cwd(), ".claude");
  }

  if (target === "codex") return path.join(home, ".codex");
  if (target === "opencode") return path.join(home, ".config", "opencode");
  return path.join(home, ".claude");
}

function supportRootFor(target, scope) {
  return path.join(targetConfigRootFor(target, scope), orchestratorSkillName);
}

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolute)));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
  return files;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function readPackageVersion() {
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  return packageJson.version;
}

async function readDomainSkillSources() {
  const sources = [];
  for (const skillName of skillNames) {
    const skillDir = path.join(packageRoot, "skills", skillName);
    const files = await listFiles(skillDir);
    for (const file of files) {
      const relativePath = path.relative(skillDir, file);
      sources.push({
        kind: "domain-skill",
        skillName,
        relativePath,
        content: await readFile(file),
      });
    }
  }

  return sources;
}

async function readSupportSources() {
  const sources = [];
  for (const support of supportFiles) {
    const supportPath = path.join(packageRoot, support);
    if (!(await exists(supportPath))) continue;

    const entries = [];
    const supportStats = await readdirOrFile(supportPath);
    entries.push(...supportStats);

    for (const file of entries) {
      sources.push({
        kind: "support",
        skillName: orchestratorSkillName,
        relativePath: path.relative(packageRoot, file),
        content: await readFile(file),
      });
    }
  }

  return sources;
}

async function readSkillSources() {
  return [...(await readDomainSkillSources()), ...(await readSupportSources())];
}

async function readAgentSource(target) {
  const agent = await readFile(path.join(packageRoot, "agent.md"), "utf8");
  if (target === "codex") {
    const content = `name = ${JSON.stringify(agentName)}\ndescription = ${JSON.stringify(agentDescription)}\ndeveloper_instructions = ${JSON.stringify(agent)}\n`;
    return {
      kind: "agent",
      skillName: orchestratorSkillName,
      relativePath: `${agentName}.toml`,
      content: Buffer.from(content, "utf8"),
    };
  }

  if (target === "claude-code") {
    const content = `---\nname: ${agentName}\ndescription: ${agentDescription}\ntools: Read, Write, Edit, Bash, Glob, Grep\nmodel: inherit\n---\n\n${agent}`;
    return {
      kind: "agent",
      skillName: orchestratorSkillName,
      relativePath: `${agentName}.md`,
      content: Buffer.from(content, "utf8"),
    };
  }

  const content = `---\ndescription: ${agentDescription}\nmode: primary\ntools:\n  write: true\n  edit: true\n  bash: true\n  webfetch: true\n---\n\n${agent}`;
  return {
    kind: "agent",
    skillName: orchestratorSkillName,
    relativePath: `${agentName}.md`,
    content: Buffer.from(content, "utf8"),
  };
}

function destinationFor(target, scope, source) {
  if (source.kind === "agent") {
    return path.join(agentRootFor(target, scope), source.relativePath);
  }
  if (source.kind === "support") {
    return path.join(supportRootFor(target, scope), source.relativePath);
  }
  return path.join(skillRootFor(target, scope), source.skillName, source.relativePath);
}

async function sourcesForTarget(target, sources) {
  return [...sources, await readAgentSource(target)];
}

async function readdirOrFile(targetPath) {
  const stats = await stat(targetPath);
  if (stats.isFile()) return [targetPath];
  return listFiles(targetPath);
}

async function readManifest() {
  const file = manifestPath();
  if (!(await exists(file))) {
    return { version: 1, entries: [] };
  }
  return JSON.parse(await readFile(file, "utf8"));
}

async function writeManifest(manifest) {
  const file = manifestPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function managedEntryFor(manifest, filePath) {
  return manifest.entries.find((entry) => path.resolve(entry.path) === path.resolve(filePath));
}

function isManagedUnmodified(manifest, filePath, content) {
  const entry = managedEntryFor(manifest, filePath);
  return Boolean(entry && sha256(content) === entry.hash);
}

async function writeManagedFile(filePath, content, options, manifest) {
  const planned = { path: filePath, hash: sha256(content) };
  if (options.dryRun) return { ...planned, action: "would-write" };

  await mkdir(path.dirname(filePath), { recursive: true });
  if (await exists(filePath)) {
    const existing = await readFile(filePath);
    if (existing.equals(content)) return { ...planned, action: "unchanged" };
    const canUpgrade = isManagedUnmodified(manifest, filePath, existing);
    if (!options.force && !canUpgrade) {
      throw new Error(`Refusing to overwrite existing file: ${filePath}. Re-run with --force to back it up and replace it.`);
    }
    if (options.force) {
      const backup = `${filePath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      await writeFile(backup, existing);
    }
  }

  await writeFile(filePath, content);
  return { ...planned, action: "written" };
}

async function assertNoConflicts(plannedFiles, options, manifest) {
  if (options.dryRun || options.force) return;
  const conflicts = [];
  for (const file of plannedFiles) {
    if (!(await exists(file.path))) continue;
    const existing = await readFile(file.path);
    if (existing.equals(file.content)) continue;
    if (isManagedUnmodified(manifest, file.path, existing)) continue;
    conflicts.push(file.path);
  }
  if (conflicts.length > 0) {
    throw new Error(`Refusing to overwrite existing files:\n${conflicts.map((file) => `- ${file}`).join("\n")}\nRe-run with --force to back them up and replace them.`);
  }
}

async function install(options) {
  const chosenTargets = expandTargets(options.target);
  const scope = normalizeScope(options.scope);
  const sources = await readSkillSources();
  const version = await readPackageVersion();
  const manifest = await readManifest();
  const entries = [];
  const plannedFiles = [];

  for (const target of chosenTargets) {
    for (const source of await sourcesForTarget(target, sources)) {
      const destination = destinationFor(target, scope, source);
      plannedFiles.push({ target, scope, skillName: source.skillName, path: destination, content: source.content });
    }
  }

  await assertNoConflicts(plannedFiles, options, manifest);

  for (const file of plannedFiles) {
      const result = await writeManagedFile(file.path, file.content, options, manifest);
      entries.push({
        target: file.target,
        scope: file.scope,
        skill: file.skillName,
        path: file.path,
        hash: result.hash,
        action: result.action,
      });
  }

  if (!options.dryRun) {
    const migrated = await removeLegacyOrchestratorSkillEntries(manifest, chosenTargets, scope, options);
    const nextEntries = migrated.manifest.entries.filter((entry) => {
      return !entries.some((candidate) => path.resolve(candidate.path) === path.resolve(entry.path));
    });
    for (const entry of entries) {
      nextEntries.push({
        target: entry.target,
        scope: entry.scope,
        skill: entry.skill,
        path: entry.path,
        hash: entry.hash,
        version,
        installedAt: new Date().toISOString(),
      });
    }
    await writeManifest({ version: 1, packageVersion: version, entries: nextEntries });
  }

  printInstallSummary(entries, options.dryRun);
}

function printInstallSummary(entries, dryRun) {
  const byTarget = new Map();
  for (const entry of entries) {
    const key = `${entry.target}:${entry.scope}`;
    if (!byTarget.has(key)) byTarget.set(key, []);
    byTarget.get(key).push(entry);
  }
  for (const [key, grouped] of byTarget.entries()) {
    const [target, scope] = key.split(":");
    const root = targetConfigRootFor(target, scope);
    const label = `${skillNames.length} skills, the give-me-job agent, and support files`;
    console.log(`${dryRun ? "Would install" : "Installed"} ${label} for ${target} (${scope}) at ${toPosixPath(root)}`);
  }
}

async function removeEmptyParents(startDir, stopDir) {
  let current = startDir;
  const stop = path.resolve(stopDir);
  while (path.resolve(current).startsWith(stop) && path.resolve(current) !== stop) {
    try {
      await rmdir(current);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}

function isLegacyOrchestratorSkillEntry(entry) {
  return entry.skill === orchestratorSkillName && path.basename(entry.path) === "SKILL.md";
}

async function removeLegacyOrchestratorSkillEntries(manifest, chosenTargets, scope, options) {
  const keep = [];
  const removed = [];
  for (const entry of manifest.entries) {
    const selected = chosenTargets.includes(entry.target) && entry.scope === scope && isLegacyOrchestratorSkillEntry(entry);
    if (!selected) {
      keep.push(entry);
      continue;
    }

    if (!(await exists(entry.path))) {
      removed.push({ ...entry, action: "missing" });
      continue;
    }

    const content = await readFile(entry.path);
    if (sha256(content) !== entry.hash) {
      keep.push(entry);
      continue;
    }

    if (!options.dryRun) {
      await rm(entry.path);
      await removeEmptyParents(path.dirname(entry.path), skillRootFor(entry.target, entry.scope));
    }
    removed.push({ ...entry, action: options.dryRun ? "would-remove" : "removed" });
  }

  return { manifest: { ...manifest, entries: keep }, removed };
}

async function uninstall(options) {
  const chosenTargets = expandTargets(options.target);
  const scope = normalizeScope(options.scope);
  const manifest = await readManifest();
  const keep = [];
  const removed = [];
  const skipped = [];

  for (const entry of manifest.entries) {
    const selected = chosenTargets.includes(entry.target) && entry.scope === scope;
    if (!selected) {
      keep.push(entry);
      continue;
    }

    if (!(await exists(entry.path))) {
      removed.push({ ...entry, action: "missing" });
      continue;
    }

    const content = await readFile(entry.path);
    if (sha256(content) !== entry.hash) {
      skipped.push(entry);
      keep.push(entry);
      continue;
    }

    if (!options.dryRun) {
      await rm(entry.path);
      await removeEmptyParents(path.dirname(entry.path), skillRootFor(entry.target, entry.scope));
    }
    removed.push({ ...entry, action: options.dryRun ? "would-remove" : "removed" });
  }

  if (!options.dryRun) {
    await writeManifest({ ...manifest, entries: keep });
  }

  console.log(`${options.dryRun ? "Would remove" : "Removed"} ${removed.length} managed files.`);
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} modified files. They remain in the manifest.`);
  }
}

async function doctor(options) {
  const chosenTargets = expandTargets(options.target);
  const scope = normalizeScope(options.scope);
  const sources = await readSkillSources();
  const sourceSkillNames = [...new Set(sources.map((source) => source.skillName))];
  console.log(`Package root: ${packageRoot}`);
  console.log(`Source skills: ${sourceSkillNames.join(", ")}`);

  for (const target of chosenTargets) {
    const root = skillRootFor(target, scope);
    const missing = [];
    for (const skill of skillNames) {
      const skillFile = path.join(root, skill, "SKILL.md");
      if (!(await exists(skillFile))) missing.push(skill);
    }
    const supportRoot = supportRootFor(target, scope);
    const agentExtension = target === "codex" ? "toml" : "md";
    const requiredSupportFiles = [
      path.join(supportRoot, "agent.md"),
      path.join(supportRoot, "tools", "init-application.mjs"),
      path.join(supportRoot, "templates", "workflow-template.md"),
      path.join(agentRootFor(target, scope), `${agentName}.${agentExtension}`),
    ];
    for (const file of requiredSupportFiles) {
      if (!(await exists(file))) missing.push(path.relative(targetConfigRootFor(target, scope), file));
    }
    if (missing.length === 0) {
      const displayRoot = targetConfigRootFor(target, scope);
      console.log(`${target} (${scope}): OK at ${toPosixPath(displayRoot)}`);
    } else {
      const displayRoot = targetConfigRootFor(target, scope);
      console.log(`${target} (${scope}): missing ${missing.join(", ")} at ${toPosixPath(displayRoot)}`);
    }
  }

  const manifest = await readManifest();
  console.log(`Manifest entries: ${manifest.entries.length} (${toPosixPath(manifestPath())})`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] ?? "install";
  const options = {
    target: args.target,
    scope: args.scope,
    force: Boolean(args.force),
    dryRun: Boolean(args["dry-run"]),
  };

  if (args.help || args.h) {
    console.log(usage());
    return;
  }

  if (command === "install") {
    await install(options);
  } else if (command === "uninstall") {
    await uninstall(options);
  } else if (command === "doctor") {
    await doctor(options);
  } else {
    throw new Error(`Unknown command: ${command}\n\n${usage()}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
