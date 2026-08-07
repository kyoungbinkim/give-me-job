#!/usr/bin/env node
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readdir, readFile, rm, rmdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { clearLine, cursorTo, emitKeypressEvents, moveCursor } from "node:readline";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { toPosixPath } from "./platform.mjs";
import { orchestratorSkillName, skillNames } from "./skill-registry.mjs";
import { agentName, generatedSourcesForTarget, readAgentSource, sourceForTarget, workflowTools } from "./install-adapters.mjs";
import {
  agentExtensionFor,
  agentRootFor,
  manifestPath,
  requiredSupportPathsFor,
  skillRootFor,
  supportFiles,
  supportRootFor,
  targetConfigRootFor,
  toolRootFor,
  targets,
} from "./install-layout.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const interactiveTargetChoices = [
  { label: "codex", value: "codex" },
  { label: "claude", value: "claude-code" },
  { label: "opencode", value: "opencode" },
  { label: "all", value: "all" },
];
const color = {
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  inverse: "\x1b[7m",
  reset: "\x1b[0m",
};
const debugTiming = process.env.GIVE_ME_JOB_DEBUG_TIMING === "1";

function usage() {
  return `Usage:
give-me-job install [--target all|codex|opencode|claude-code] [--scope user|project] [--force] [--dry-run]
give-me-job uninstall [--target all|codex|opencode|claude-code] [--scope user|project] [--dry-run]
give-me-job doctor [--target all|codex|opencode|claude-code] [--scope user|project]

Defaults: install prompts for --target and uses --scope user
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

function normalizeInteractiveTarget(value) {
  const text = String(value ?? "").trim().toLowerCase();
  const numbered = Number(text);
  if (Number.isInteger(numbered) && numbered >= 1 && numbered <= interactiveTargetChoices.length) {
    return interactiveTargetChoices[numbered - 1].value;
  }

  const match = interactiveTargetChoices.find((choice) => choice.label === text || choice.value === text);
  if (match) return match.value;
  throw new Error(`Unknown target choice: ${value}`);
}

async function promptInstallTarget() {
  if (process.stdin.isTTY && process.stdout.isTTY) {
    return promptInstallTargetInteractive();
  }

  const input = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("Which AI agent would you like to install to?");
    for (const [index, choice] of interactiveTargetChoices.entries()) {
      console.log(`${index + 1}. ${choice.label}`);
    }
    const answer = await input.question("Enter choice: ");
    return normalizeInteractiveTarget(answer);
  } finally {
    input.close();
  }
}

function targetPromptLines(selectedIndex) {
  return [
    `${color.bold}${color.cyan}Which AI agent would you like to install to?${color.reset}`,
    `${color.dim}Use ↑/↓ to move, Enter to select.${color.reset}`,
    ...interactiveTargetChoices.map((choice, index) => {
      const selected = index === selectedIndex;
      const pointer = selected ? `${color.green}›${color.reset}` : " ";
      const label = selected ? `${color.inverse} ${choice.label} ${color.reset}` : ` ${choice.label} `;
      return `${pointer} ${label}`;
    }),
  ];
}

function renderTargetPrompt(selectedIndex, previousLineCount = 0) {
  const lines = targetPromptLines(selectedIndex);
  if (previousLineCount > 0) {
    moveCursor(process.stdout, 0, -previousLineCount);
  }

  for (const line of lines) {
    cursorTo(process.stdout, 0);
    clearLine(process.stdout, 0);
    process.stdout.write(`${line}\n`);
  }
  return lines.length;
}

function promptInstallTargetInteractive() {
  return new Promise((resolve, reject) => {
    let selectedIndex = 0;
    let renderedLines = 0;
    const canUseRawMode = typeof process.stdin.setRawMode === "function";
    let done = false;

    function cleanup() {
      if (done) return;
      done = true;
      process.stdin.off("keypress", onKeypress);
      if (canUseRawMode) process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\x1b[?25h");
    }

    function finish() {
      const choice = interactiveTargetChoices[selectedIndex];
      cleanup();
      console.log(`${color.green}Selected:${color.reset} ${choice.label}`);
      resolve(choice.value);
    }

    function onKeypress(_input, key = {}) {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Install target selection cancelled."));
        return;
      }
      if (key.name === "up") {
        selectedIndex = (selectedIndex - 1 + interactiveTargetChoices.length) % interactiveTargetChoices.length;
        renderedLines = renderTargetPrompt(selectedIndex, renderedLines);
        return;
      }
      if (key.name === "down") {
        selectedIndex = (selectedIndex + 1) % interactiveTargetChoices.length;
        renderedLines = renderTargetPrompt(selectedIndex, renderedLines);
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        finish();
      }
    }

    emitKeypressEvents(process.stdin);
    process.stdin.on("keypress", onKeypress);
    if (canUseRawMode) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write("\x1b[?25l");
    renderedLines = renderTargetPrompt(selectedIndex);
  });
}

async function resolveInstallTarget(options) {
  return options.target === undefined ? await promptInstallTarget() : options.target;
}

function normalizeScope(value) {
  const scope = String(value ?? "user");
  if (!["user", "project"].includes(scope)) {
    throw new Error(`Unknown scope: ${scope}`);
  }
  return scope;
}

function timingStart() {
  return performance.now();
}

function timingLog(label, startedAt) {
  if (!debugTiming) return;
  const elapsed = Math.round(performance.now() - startedAt);
  console.error(`[give-me-job:timing] ${label}: ${elapsed}ms`);
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

function destinationFor(target, scope, source) {
  if (source.kind === "agent") {
    return path.join(agentRootFor(target, scope), source.relativePath);
  }
  if (source.kind === "opencode-tool") {
    return path.join(toolRootFor(target, scope), source.relativePath);
  }
  if (source.kind === "support") {
    return path.join(supportRootFor(target, scope), source.relativePath);
  }
  return path.join(skillRootFor(target, scope), source.skillName, source.relativePath);
}

async function sourcesForTarget(target, scope, sources) {
  return [...sources.map((source) => sourceForTarget(target, source)), await readAgentSource(target, packageRoot), ...generatedSourcesForTarget(target, scope)];
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
  const totalStartedAt = timingStart();
  let startedAt = timingStart();
  const chosenTargets = expandTargets(await resolveInstallTarget(options));
  timingLog("resolve target", startedAt);

  startedAt = timingStart();
  const scope = normalizeScope(options.scope);
  const sources = await readSkillSources();
  const version = await readPackageVersion();
  const manifest = await readManifest();
  const entries = [];
  const plannedFiles = [];
  timingLog("read sources and manifest", startedAt);

  startedAt = timingStart();
  for (const target of chosenTargets) {
    for (const source of await sourcesForTarget(target, scope, sources)) {
      const destination = destinationFor(target, scope, source);
      plannedFiles.push({ target, scope, kind: source.kind, skillName: source.skillName, path: destination, content: source.content });
    }
  }
  timingLog("plan files", startedAt);

  startedAt = timingStart();
  await assertNoConflicts(plannedFiles, options, manifest);
  timingLog("check conflicts", startedAt);

  startedAt = timingStart();
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
  timingLog("write files", startedAt);

  if (!options.dryRun) {
    startedAt = timingStart();
    const migrated = await removeRetiredManagedEntries(manifest, chosenTargets, scope, options);
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
    timingLog("write manifest", startedAt);
  }

  printInstallSummary(entries, options.dryRun);
  timingLog("total install", totalStartedAt);
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
    const label = `${skillNames.length} skills, the give-me-job agent, and support files`;
    console.log(`${dryRun ? "Would install" : "Installed"} ${label} for ${target} (${scope}):`);
    console.log(`  skills:  ${toPosixPath(skillRootFor(target, scope))}`);
    console.log(`  agent:   ${toPosixPath(path.join(agentRootFor(target, scope), `${agentName}.${agentExtensionFor(target)}`))}`);
    if (target === "opencode") {
      console.log(`  tools:   ${toPosixPath(toolRootFor(target, scope))}`);
    }
    if (target === "claude-code") {
      console.log(`  tools:   ${toPosixPath(skillRootFor(target, scope))}/give-me-job-<tool>/SKILL.md`);
    }
    console.log(`  support: ${toPosixPath(supportRootFor(target, scope))}`);
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

// Files an earlier release installed into the support bundle and no longer
// ships. `.env.example` configured job-source credentials, which this project
// no longer uses at all, so leaving a stale copy on disk is misleading.
const retiredSupportFiles = new Set([".env.example"]);

function isRetiredSupportFileEntry(entry) {
  if (entry.skill !== orchestratorSkillName) return false;
  const supportRoot = path.resolve(supportRootFor(entry.target, entry.scope));
  const relative = path.relative(supportRoot, path.resolve(entry.path));
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  return retiredSupportFiles.has(toPosixPath(relative));
}

async function removeRetiredManagedEntries(manifest, chosenTargets, scope, options) {
  const keep = [];
  const removed = [];
  for (const entry of manifest.entries) {
    const retired = isLegacyOrchestratorSkillEntry(entry) || isRetiredSupportFileEntry(entry);
    const selected = chosenTargets.includes(entry.target) && entry.scope === scope && retired;
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
      const stopDir = isRetiredSupportFileEntry(entry)
        ? supportRootFor(entry.target, entry.scope)
        : skillRootFor(entry.target, entry.scope);
      await rm(entry.path);
      await removeEmptyParents(path.dirname(entry.path), stopDir);
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
    const requiredFiles = [
      ...requiredSupportPathsFor(target, scope),
      path.join(agentRootFor(target, scope), `${agentName}.${agentExtensionFor(target)}`),
    ];
    if (target === "opencode") {
      requiredFiles.push(...workflowTools.map((toolSpec) => path.join(toolRootFor(target, scope), `give_me_job_${toolSpec.name.replaceAll("-", "_")}.js`)));
    }
    if (target === "claude-code") {
      requiredFiles.push(...workflowTools.map((toolSpec) => path.join(skillRootFor(target, scope), `give-me-job-${toolSpec.name}`, "SKILL.md")));
    }
    for (const file of requiredFiles) {
      if (!(await exists(file))) missing.push(path.relative(targetConfigRootFor(target, scope), file));
    }
    if (missing.length === 0) {
      console.log(`${target} (${scope}): OK`);
      console.log(`  skills:  ${toPosixPath(skillRootFor(target, scope))}`);
      console.log(`  agent:   ${toPosixPath(path.join(agentRootFor(target, scope), `${agentName}.${agentExtensionFor(target)}`))}`);
      if (target === "opencode") {
        console.log(`  tools:   ${toPosixPath(toolRootFor(target, scope))}`);
      }
      if (target === "claude-code") {
        console.log(`  tools:   ${toPosixPath(skillRootFor(target, scope))}/give-me-job-<tool>/SKILL.md`);
      }
      console.log(`  support: ${toPosixPath(supportRootFor(target, scope))}`);
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
