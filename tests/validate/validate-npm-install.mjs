import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { skillNames as expectedSkills } from "../../tools/skill-registry.mjs";
import { workflowTools } from "../../tools/install-adapters.mjs";
import {
  agentExtensionFor,
  agentRootFor,
  requiredSupportFiles,
  skillRootFor,
  targetConfigRootFor,
  toolRootFor,
  targets,
} from "../../tools/install-layout.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const cli = path.join(root, "tools", "give-me-job-cli.mjs");
const expectedWorkflowTools = workflowTools.map((tool) => tool.name);

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd ?? root,
    env: {
      ...process.env,
      GIVE_ME_JOB_HOME: options.home,
    },
    encoding: "utf8",
  });
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function exists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function assertSkills(rootDir) {
  for (const skill of expectedSkills) {
    const skillFile = path.join(rootDir, skill, "SKILL.md");
    assert(await exists(skillFile), `missing installed skill: ${skillFile}`);
  }
}

async function assertSupportBundle(rootDir) {
  const bundleRoot = path.join(rootDir, "give-me-job");
  for (const relativePath of requiredSupportFiles) {
    const file = path.join(bundleRoot, relativePath);
    assert(await exists(file), `missing installed support file: ${file}`);
  }
}

async function assertAgentInstall(target, scope, options) {
  const skillRootDir = skillRootFor(target, scope, options);
  const configRootDir = targetConfigRootFor(target, scope, options);
  await assertSkills(skillRootDir);
  if (target === "claude-code") {
    const jobSearcher = await readFile(path.join(skillRootDir, "job-searcher", "SKILL.md"), "utf8");
    assert(
      jobSearcher.includes("allowed-tools: Bash(node *fetch-jobs.mjs), Bash(node *fetch-jobs.mjs *), Read, Grep"),
      "Claude Code job-searcher skill must restrict Bash to fetch-jobs",
    );
    const agent = await readFile(path.join(agentRootFor(target, scope, options), `give-me-job.${agentExtensionFor(target)}`), "utf8");
    assert(!agent.includes("tools: Read, Write, Edit, Bash"), "Claude Code agent must not grant unrestricted Bash access");
    for (const toolName of expectedWorkflowTools) {
      const toolSkill = path.join(skillRootDir, `give-me-job-${toolName}`, "SKILL.md");
      assert(await exists(toolSkill), `missing Claude Code tool skill: ${toolSkill}`);
      const text = await readFile(toolSkill, "utf8");
      const scriptName = workflowTools.find((tool) => tool.name === toolName).script.split("/").at(-1);
      assert(
        text.includes(`allowed-tools: Bash(node *${scriptName}), Bash(node *${scriptName} *), Read, Grep`),
        `Claude Code tool skill must restrict Bash to ${scriptName}: ${toolSkill}`,
      );
    }
  }
  if (target === "opencode") {
    const toolRootDir = toolRootFor(target, scope, options);
    for (const toolName of expectedWorkflowTools) {
      const toolFile = path.join(toolRootDir, `give_me_job_${toolName.replaceAll("-", "_")}.js`);
      assert(await exists(toolFile), `missing OpenCode custom tool: ${toolFile}`);
      const text = await readFile(toolFile, "utf8");
      assert(text.includes("export default tool"), `OpenCode custom tool must export a tool definition: ${toolFile}`);
      assert(text.includes("function validateArgs"), `OpenCode custom tool must validate arguments: ${toolFile}`);
      assert(text.includes("blockedFlags"), `OpenCode custom tool must include blocked flag policy: ${toolFile}`);
      assert(text.includes("Path for ${flag} must stay inside the current workspace"), `OpenCode custom tool must restrict path flags: ${toolFile}`);
    }
  }
  assert(
    await exists(path.join(agentRootFor(target, scope, options), `give-me-job.${agentExtensionFor(target)}`)),
    `missing give-me-job agent under ${configRootDir}`,
  );
  await assertSupportBundle(configRootDir);
}

async function main() {
  const temp = await mkdtemp(path.join(os.tmpdir(), "give-me-job-install-"));
  const home = path.join(temp, "home");
  const project = path.join(temp, "project");

  try {
    await mkdir(project, { recursive: true });
    const dryRun = run(["install", "--target", "all", "--dry-run"], { home });
    assert(dryRun.status === 0, `dry-run install failed: ${dryRun.stderr}`);
    assert(!(await exists(path.join(home, ".give-me-job", "install-manifest.json"))), "dry-run wrote a manifest");

    const installAll = run(["install", "--target", "all"], { home });
    assert(installAll.status === 0, `user install failed: ${installAll.stderr}`);
    for (const target of targets) {
      await assertAgentInstall(target, "user", { home });
    }

    const manifestFile = path.join(home, ".give-me-job", "install-manifest.json");
    const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
    assert(manifest.entries.length > expectedSkills.length, "manifest did not record installed files");

    const managedOpenCodeSkill = path.join(home, ".config", "opencode", "skills", "resume-intake", "SKILL.md");
    const oldManagedContent = "old managed skill\n";
    await writeFile(managedOpenCodeSkill, oldManagedContent, "utf8");
    const managedOpenCodeEntry = manifest.entries.find((entry) => path.resolve(entry.path) === path.resolve(managedOpenCodeSkill));
    assert(managedOpenCodeEntry, "missing managed OpenCode skill in manifest");
    managedOpenCodeEntry.hash = sha256(oldManagedContent);
    managedOpenCodeEntry.version = "0.4.0";

    const legacyOpenCodeSkill = path.join(home, ".config", "opencode", "skills", "give-me-job", "SKILL.md");
    const legacyContent = "---\nname: give-me-job\n---\nlegacy orchestrator skill\n";
    await mkdir(path.dirname(legacyOpenCodeSkill), { recursive: true });
    await writeFile(legacyOpenCodeSkill, legacyContent, "utf8");
    manifest.entries.push({
      target: "opencode",
      scope: "user",
      skill: "give-me-job",
      path: legacyOpenCodeSkill,
      hash: sha256(legacyContent),
      version: "0.4.0",
      installedAt: "2026-01-01T00:00:00.000Z",
    });
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const managedUpgrade = run(["install", "--target", "opencode"], { home });
    assert(managedUpgrade.status === 0, `managed upgrade failed without --force: ${managedUpgrade.stderr}`);
    assert((await readFile(managedOpenCodeSkill, "utf8")) !== oldManagedContent, "managed upgrade did not refresh existing skill");
    assert(!(await exists(legacyOpenCodeSkill)), "managed upgrade did not remove legacy OpenCode orchestrator skill");

    const codexAgent = path.join(home, ".codex", "agents", "give-me-job.toml");
    await writeFile(codexAgent, "local edit\n", "utf8");
    const conflict = run(["install", "--target", "codex"], { home });
    assert(conflict.status !== 0, "install should fail on modified managed file without --force");
    const forced = run(["install", "--target", "codex", "--force"], { home });
    assert(forced.status === 0, `force install failed: ${forced.stderr}`);
    const codexFiles = await readdir(path.dirname(codexAgent));
    assert(codexFiles.some((file) => file.startsWith("give-me-job.toml.bak-")), "force install did not create a backup");

    const uninstall = run(["uninstall", "--target", "all"], { home });
    assert(uninstall.status === 0, `uninstall failed: ${uninstall.stderr}`);
    assert(!(await exists(codexAgent)), "uninstall did not remove managed agent file");

    for (const target of targets) {
      const result = run(["install", "--target", target, "--scope", "project"], { home, cwd: project });
      assert(result.status === 0, `project install failed for ${target}: ${result.stderr}`);
    }
    for (const target of targets) {
      await assertAgentInstall(target, "project", { home, cwd: project });
    }

    console.log("npm install validation passed");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
