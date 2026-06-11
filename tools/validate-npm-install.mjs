import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "tools", "give-me-job-cli.mjs");
const expectedSkills = [
  "resume-intake",
  "jd-analyzer",
  "company-values-analyzer",
  "cover-letter-writer",
  "hr-reviewer",
  "application-packager",
  "give-me-job",
];

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
    await assertSkills(path.join(home, ".agents", "skills"));
    await assertSkills(path.join(home, ".config", "opencode", "skills"));
    await assertSkills(path.join(home, ".claude", "skills"));

    const manifest = JSON.parse(await readFile(path.join(home, ".give-me-job", "install-manifest.json"), "utf8"));
    assert(manifest.entries.length > expectedSkills.length, "manifest did not record installed files");

    const codexSkill = path.join(home, ".agents", "skills", "give-me-job", "SKILL.md");
    await writeFile(codexSkill, "local edit\n", "utf8");
    const conflict = run(["install", "--target", "codex"], { home });
    assert(conflict.status !== 0, "install should fail on modified managed file without --force");
    const forced = run(["install", "--target", "codex", "--force"], { home });
    assert(forced.status === 0, `force install failed: ${forced.stderr}`);
    const codexFiles = await readdir(path.dirname(codexSkill));
    assert(codexFiles.some((file) => file.startsWith("SKILL.md.bak-")), "force install did not create a backup");

    const uninstall = run(["uninstall", "--target", "all"], { home });
    assert(uninstall.status === 0, `uninstall failed: ${uninstall.stderr}`);
    assert(!(await exists(codexSkill)), "uninstall did not remove managed skill file");

    for (const target of ["codex", "opencode", "claude-code"]) {
      const result = run(["install", "--target", target, "--scope", "project"], { home, cwd: project });
      assert(result.status === 0, `project install failed for ${target}: ${result.stderr}`);
    }
    await assertSkills(path.join(project, ".agents", "skills"));
    await assertSkills(path.join(project, ".opencode", "skills"));
    await assertSkills(path.join(project, ".claude", "skills"));

    console.log("npm install validation passed");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
