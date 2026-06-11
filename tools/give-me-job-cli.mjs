#!/usr/bin/env node
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toPosixPath } from "./platform.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillNames = [
  "resume-intake",
  "jd-analyzer",
  "company-values-analyzer",
  "cover-letter-writer",
  "hr-reviewer",
  "application-packager",
];
const orchestratorSkillName = "give-me-job";
const allSkillNames = [...skillNames, orchestratorSkillName];
const targets = ["codex", "opencode", "claude-code"];

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

async function readSkillSources() {
  const sources = [];
  for (const skillName of skillNames) {
    const skillDir = path.join(packageRoot, "skills", skillName);
    const files = await listFiles(skillDir);
    for (const file of files) {
      const relativePath = path.relative(skillDir, file);
      sources.push({
        skillName,
        relativePath,
        content: await readFile(file),
      });
    }
  }

  const agent = await readFile(path.join(packageRoot, "agent.md"), "utf8");
  const orchestrator = `---\nname: ${orchestratorSkillName}\ndescription: Run the Korea-only give-me-job application workflow. Use when preparing a company-specific Korean job application package from resume.md, a JD, and optional company values while never submitting, logging in, bypassing CAPTCHA, or transmitting personal information.\n---\n\n${agent}`;
  sources.push({
    skillName: orchestratorSkillName,
    relativePath: "SKILL.md",
    content: Buffer.from(orchestrator, "utf8"),
  });

  return sources;
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

async function writeManagedFile(filePath, content, options) {
  const planned = { path: filePath, hash: sha256(content) };
  if (options.dryRun) return { ...planned, action: "would-write" };

  await mkdir(path.dirname(filePath), { recursive: true });
  if (await exists(filePath)) {
    const existing = await readFile(filePath);
    if (existing.equals(content)) return { ...planned, action: "unchanged" };
    if (!options.force) {
      throw new Error(`Refusing to overwrite existing file: ${filePath}. Re-run with --force to back it up and replace it.`);
    }
    const backup = `${filePath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    await writeFile(backup, existing);
  }

  await writeFile(filePath, content);
  return { ...planned, action: "written" };
}

async function assertNoConflicts(plannedFiles, options) {
  if (options.dryRun || options.force) return;
  const conflicts = [];
  for (const file of plannedFiles) {
    if (!(await exists(file.path))) continue;
    const existing = await readFile(file.path);
    if (!existing.equals(file.content)) conflicts.push(file.path);
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
    const skillRoot = skillRootFor(target, scope);
    for (const source of sources) {
      const destination = path.join(skillRoot, source.skillName, source.relativePath);
      plannedFiles.push({ target, scope, skillName: source.skillName, path: destination, content: source.content });
    }
  }

  await assertNoConflicts(plannedFiles, options);

  for (const file of plannedFiles) {
      const result = await writeManagedFile(file.path, file.content, options);
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
    const nextEntries = manifest.entries.filter((entry) => {
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
    const skillRoot = skillRootFor(target, scope);
    console.log(`${dryRun ? "Would install" : "Installed"} ${allSkillNames.length} skills for ${target} (${scope}) at ${toPosixPath(skillRoot)}`);
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
    for (const skill of allSkillNames) {
      const skillFile = path.join(root, skill, "SKILL.md");
      if (!(await exists(skillFile))) missing.push(skill);
    }
    if (missing.length === 0) {
      console.log(`${target} (${scope}): OK at ${toPosixPath(root)}`);
    } else {
      console.log(`${target} (${scope}): missing ${missing.join(", ")} at ${toPosixPath(root)}`);
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
