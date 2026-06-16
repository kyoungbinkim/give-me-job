#!/usr/bin/env node
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readdir, readFile, rm, rmdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toPosixPath } from "./platform.mjs";
import { orchestratorSkillName, skillNames } from "./skill-registry.mjs";
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
const agentName = "give-me-job";
const agentDescription =
  "Run the Korea-only give-me-job application workflow. Use when preparing a company-specific Korean job application package from resume.md, a JD, and optional company values while never submitting, logging in, bypassing CAPTCHA, or transmitting personal information.";
const workflowTools = [
  {
    name: "fetch-jobs",
    script: "tools/fetch-jobs.mjs",
    description: "Search Korean job postings and company information through the give-me-job job-source adapters.",
    hint: "[--source work24|saramin|jobkorea] [flags...]",
  },
  {
    name: "init-application",
    script: "tools/init-application.mjs",
    description: "Create a company-role Korean application package folder from give-me-job templates.",
    hint: "--company <company> --role <role> [--out applications] [--force]",
  },
  {
    name: "schedule-jobs",
    script: "tools/schedule-jobs.mjs",
    description: "Summarize today, tomorrow, or weekly deadlines from normalized job files.",
    hint: "[--today|--tomorrow|--week] [--jobs data/jobs]",
  },
  {
    name: "rank-jobs",
    script: "tools/rank-jobs.mjs",
    description: "Rank normalized job postings against a resume.md source file.",
    hint: "--resume resume.md --jobs data/jobs",
  },
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

function sourceForTarget(target, source) {
  if (target !== "claude-code" || source.kind !== "domain-skill" || source.skillName !== "job-searcher" || source.relativePath !== "SKILL.md") {
    return source;
  }

  const text = source.content.toString("utf8");
  if (text.includes("\nallowed-tools:")) return source;
  const content = text.replace(/^---\r?\n/, "---\nallowed-tools: Bash, Read, Grep\n");
  return { ...source, content: Buffer.from(content, "utf8") };
}

function claudeToolSkillContent(toolSpec, scriptPath) {
  return [
    "---",
    `name: give-me-job-${toolSpec.name}`,
    `description: ${toolSpec.description}`,
    "allowed-tools: Bash, Read, Grep",
    `argument-hint: ${JSON.stringify(toolSpec.hint)}`,
    "disable-model-invocation: true",
    "---",
    "",
    `# give-me-job ${toolSpec.name}`,
    "",
    `Use this Claude Code tool skill to run the installed \`${toolSpec.script}\` support script.`,
    "",
    "## Execution",
    "",
    "1. Treat this as an allowlisted give-me-job workflow tool, not as a generic script runner.",
    "2. Verify Node.js is available with `node --version` if needed.",
    "3. Run the installed script with Claude Code's Bash tool:",
    "",
    "```bash",
    `node ${JSON.stringify(scriptPath)} $ARGUMENTS`,
    "```",
    "",
    "4. Report the real stdout/stderr and exit code. Do not fabricate results.",
    "",
  ].join("\n");
}

function opencodeToolContent(toolSpec, scriptPath) {
  return `import { tool } from "@opencode-ai/plugin";
import { spawn } from "node:child_process";

const scriptPath = ${JSON.stringify(scriptPath)};

function runNode(args, context) {
  return new Promise((resolve) => {
    const child = spawn("node", [scriptPath, ...(args.args ?? [])], {
      cwd: context?.directory ?? process.cwd(),
      env: process.env,
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString("utf8");
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString("utf8");
    });
    child.on("error", (error) => {
      resolve(JSON.stringify({ success: false, exitCode: null, stdout, stderr: stderr ? stderr + "\\n" + error.message : error.message }, null, 2));
    });
    child.on("close", (code) => {
      resolve(JSON.stringify({ success: code === 0, exitCode: code, stdout, stderr }, null, 2));
    });
  });
}

export default tool({
  description: ${JSON.stringify(toolSpec.description)},
  args: {
    args: tool.schema.array(tool.schema.string()).optional().describe("Command-line arguments passed to ${toolSpec.script}, excluding node and the script path."),
  },
  async execute(args, context) {
    return runNode(args, context);
  },
});
`;
}

function generatedSourcesForTarget(target, scope) {
  if (target === "claude-code") {
    return workflowTools.map((toolSpec) => {
      const scriptPath = path.join(supportRootFor(target, scope), toolSpec.script);
      return {
        kind: "claude-tool-skill",
        skillName: `give-me-job-${toolSpec.name}`,
        relativePath: "SKILL.md",
        content: Buffer.from(claudeToolSkillContent(toolSpec, scriptPath), "utf8"),
      };
    });
  }

  if (target === "opencode") {
    return workflowTools.map((toolSpec) => {
      const scriptPath = path.join(supportRootFor(target, scope), toolSpec.script);
      return {
        kind: "opencode-tool",
        skillName: `give-me-job-${toolSpec.name}`,
        relativePath: `give_me_job_${toolSpec.name.replaceAll("-", "_")}.js`,
        content: Buffer.from(opencodeToolContent(toolSpec, scriptPath), "utf8"),
      };
    });
  }

  return [];
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

  const content = `---\ndescription: ${agentDescription}\nmode: primary\npermission:\n  edit: allow\n  bash: allow\n  webfetch: allow\n  skill: allow\n---\n\n${agent}`;
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
  if (source.kind === "opencode-tool") {
    return path.join(toolRootFor(target, scope), source.relativePath);
  }
  if (source.kind === "support") {
    return path.join(supportRootFor(target, scope), source.relativePath);
  }
  return path.join(skillRootFor(target, scope), source.skillName, source.relativePath);
}

async function sourcesForTarget(target, scope, sources) {
  return [...sources.map((source) => sourceForTarget(target, source)), await readAgentSource(target), ...generatedSourcesForTarget(target, scope)];
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
    for (const source of await sourcesForTarget(target, scope, sources)) {
      const destination = destinationFor(target, scope, source);
      plannedFiles.push({ target, scope, kind: source.kind, skillName: source.skillName, path: destination, content: source.content });
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
