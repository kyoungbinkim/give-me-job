import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { skillNames as expectedSkills } from "../../tools/skill-registry.mjs";
import { supportPackageEntries } from "../../tools/install-layout.mjs";

const root = process.cwd();
const skillsDir = path.join(root, "skills");
const agentFile = path.join(root, "agent.md");
const agentsFile = path.join(root, "AGENTS.md");
const bannedDocs = new Set([
  "README.md",
  "INSTALL.md",
  "INSTALLATION_GUIDE.md",
  "QUICK_REFERENCE.md",
  "CHANGELOG.md",
]);
const requiredReleaseFiles = [
  "docs/quickstart.md",
  "docs/competitive-v1-roadmap.md",
  "docs/integrations/job-sources.md",
  "docs/platform-support.md",
  "docs/safety.md",
  "docs/release-checklist.md",
  "templates/workflow-template.md",
  "templates/company-values-empty-template.md",
  "templates/interview-prep-template.md",
  "SECURITY.md",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "tools/platform.mjs",
  "tools/normalize-job.mjs",
  "tools/job-store.mjs",
  "tools/fetch-jobs.mjs",
  "tools/job-sources/manual-url.mjs",
  "tools/schedule-jobs.mjs",
  "tools/rank-jobs.mjs",
  "tools/init-application.mjs",
  "tools/install-adapters.mjs",
  "tools/install-layout.mjs",
  "tools/skill-registry.mjs",
  "support/validate/validate-application.mjs",
  "support/validate/validate-job-schedule.mjs",
  "support/validate/validate-job-ranking.mjs",
  "tests/validate/validate-codex-agent-workflow.mjs",
  "tests/validate/validate-lg-electronics-workflow.mjs",
  "tests/validate/validate-manual-url-intake.mjs",
  "tests/fixtures/job-pages/jobkorea.html",
  "tests/fixtures/job-pages/jobkorea-detail.html",
  "tests/fixtures/job-pages/linkareer.html",
  "tests/fixtures/job-pages/skcareers.html",
  "tests/fixtures/job-pages/lgcareers.json",
  "tests/fixtures/jobs-normalized/job-today.json",
  "tests/fixtures/jobs-normalized/job-tomorrow.json",
  "tests/fixtures/jobs-normalized/job-week.json",
  "tests/fixtures/jobs-normalized/job-rolling.json",
  "tests/fixtures/jobs-normalized/job-expired.json",
  "package.json",
  "examples/demo-new-grad-backend/applications/demo-cloud-backend/workflow.md",
  "examples/demo-new-grad-backend/applications/demo-cloud-backend/evidence-map.md",
  "examples/demo-new-grad-backend/applications/demo-cloud-backend/hr-review.md",
  "examples/demo-new-grad-backend/applications/demo-cloud-backend/interview-prep.md",
  "examples/demo-new-grad-backend/applications/demo-cloud-backend/cover-letter-final.md",
];
// This project must not require an API key, access token, or any other issued
// credential. These files existed only to configure them.
const forbiddenReleaseFiles = [".env.example", "tools/env.mjs"];
const coreTextFiles = [
  "README.md",
  "AGENTS.md",
  "agent.md",
  ...expectedSkills.map((skill) => `skills/${skill}/SKILL.md`),
];
const mojibakePatterns = [
  "?꾩",
  "?먭",
  "?먯",
  "?낆",
  "?쒖",
  "吏",
  "怨듦",
  "쒋",
  "붴",
  "異쒕",
];
const expectedKoreanSnippets = new Map([
  ["README.md", ["자기소개서", "취업준비"]],
  ["package.json", ["자기소개서", "취업준비"]],
  ["agent.md", ["자소서", "공고"]],
  ["docs/README-ko.md", ["자기소개서", "한국 채용", "제출"]],
  ["skills/job-searcher/SKILL.md", ["한국 채용", "채용", "공고"]],
  ["skills/cover-letter-writer/SKILL.md", ["자기소개서", "지원동기", "자소서"]],
  ["skills/hr-reviewer/SKILL.md", ["자기소개서", "자소서", "제출"]],
]);

const errors = [];

async function exists(target) {
  try {
    await stat(target);
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

function parseFrontmatter(text, file) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    errors.push(`${file}: missing YAML frontmatter`);
    return {};
  }

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].trim();
  }
  return fields;
}

async function validateSkill(skillName) {
  const skillPath = path.join(skillsDir, skillName);
  const skillFile = path.join(skillPath, "SKILL.md");

  if (!(await exists(skillPath))) {
    errors.push(`${skillName}: missing skill directory`);
    return;
  }
  if (!(await exists(skillFile))) {
    errors.push(`${skillName}: missing SKILL.md`);
    return;
  }

  const text = await readFile(skillFile, "utf8");
  const frontmatter = parseFrontmatter(text, `${skillName}/SKILL.md`);

  if (frontmatter.name !== skillName) {
    errors.push(`${skillName}/SKILL.md: name must match folder name`);
  }
  if (!frontmatter.description || frontmatter.description.length < 120) {
    errors.push(`${skillName}/SKILL.md: description must be specific enough for triggering`);
  }
  // Users of a Korea-only product type Korean. The description is what the
  // agent matches a request against, so an English-only one will not trigger
  // on a request like "이력서 정리해줘".
  if (frontmatter.description && !/[가-힣]/.test(frontmatter.description)) {
    errors.push(`${skillName}/SKILL.md: description must include Korean trigger phrases`);
  }
  const keys = Object.keys(frontmatter);
  for (const key of keys) {
    if (!["name", "description"].includes(key)) {
      errors.push(`${skillName}/SKILL.md: unsupported frontmatter field ${key}`);
    }
  }

  const files = await readdir(skillPath);
  for (const file of files) {
    if (bannedDocs.has(file)) {
      errors.push(`${skillName}: banned auxiliary document ${file}`);
    }
  }

  if (!/Workflow|절차|Inputs|입력/i.test(text)) {
    errors.push(`${skillName}/SKILL.md: missing workflow or input guidance`);
  }
  if (!/Output|출력/i.test(text)) {
    errors.push(`${skillName}/SKILL.md: missing output guidance`);
  }
  if (!/Fallback|fallback|대안/i.test(text)) {
    errors.push(`${skillName}/SKILL.md: missing fallback guidance`);
  }

  if (["cover-letter-writer", "hr-reviewer", "interview-prep", "application-packager"].includes(skillName)) {
    if (!text.includes("resume.md")) {
      errors.push(`${skillName}/SKILL.md: must mention resume.md evidence rules`);
    }
  }
}

async function validateAgent() {
  if (!(await exists(agentsFile))) {
    errors.push("missing root AGENTS.md repository instructions");
  } else {
    const text = await readFile(agentsFile, "utf8");
    for (const snippet of ["agent.md", "skills/", "resume.md", "validate-skills.mjs"]) {
      if (!text.includes(snippet)) {
        errors.push(`AGENTS.md: missing repository instruction snippet: ${snippet}`);
      }
    }
  }

  if (!(await exists(agentFile))) {
    errors.push("missing root agent.md orchestrator");
    return;
  }

  const text = await readFile(agentFile, "utf8");
  const normalizedText = text.toLowerCase();
  const requiredSnippets = [
    "resume.md",
    "applications/<company-role>/",
    "jd-analyzer",
    "cover-letter-writer",
    "hr-reviewer",
    "application-packager",
    "do not click submit",
    "do not run this agent for final submission",
  ];

  for (const snippet of requiredSnippets) {
    if (!normalizedText.includes(snippet.toLowerCase())) {
      errors.push(`agent.md: missing required orchestration policy or step: ${snippet}`);
    }
  }

  if (!/Stop Conditions/i.test(text)) {
    errors.push("agent.md: missing stop conditions");
  }
  if (!/Workflow Log/i.test(text)) {
    errors.push("agent.md: missing workflow log guidance");
  }
}

async function validateReleasePackaging() {
  const toolsDir = path.join(root, "tools");
  const toolFiles = await listFiles(toolsDir);
  for (const file of toolFiles) {
    if (/validate-.*\.mjs$/.test(path.basename(file))) {
      errors.push(`tools/: test validation script must not live in tools/: ${path.relative(root, file)}`);
    }
  }

  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const packageFiles = packageJson.files ?? [];
  const forbiddenPackageEntries = [
    "tests/",
    "tests/validate/",
    "tests/golden/",
    "give-me-job-agent-expert-review.md",
    "give-me-job-hr-review_2.md",
    "job-agent-plan.md",
  ];
  for (const entry of forbiddenPackageEntries) {
    if (packageFiles.includes(entry)) {
      errors.push(`package.json files must not include dev-only entry: ${entry}`);
    }
  }

  const requiredPackageEntries = [
    "skills/",
    ...supportPackageEntries,
  ];
  for (const required of requiredPackageEntries) {
    if (!packageFiles.includes(required)) {
      errors.push(`package.json files missing required package entry: ${required}`);
    }
  }
}

// The Claude Code plugin manifests restate the package version and point at the
// skill root. Both drift silently, so check them rather than trusting them.
async function validatePluginManifests() {
  const pluginDir = path.join(root, ".claude-plugin");
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

  let plugin;
  let marketplace;
  for (const [name, assign] of [
    ["plugin.json", (value) => (plugin = value)],
    ["marketplace.json", (value) => (marketplace = value)],
  ]) {
    const file = path.join(pluginDir, name);
    if (!(await exists(file))) {
      errors.push(`missing plugin manifest: .claude-plugin/${name}`);
      continue;
    }
    try {
      assign(JSON.parse(await readFile(file, "utf8")));
    } catch (error) {
      errors.push(`.claude-plugin/${name}: invalid JSON: ${error.message}`);
    }
  }

  if (plugin && plugin.version !== packageJson.version) {
    errors.push(
      `.claude-plugin/plugin.json version ${plugin.version} does not match package.json ${packageJson.version}`,
    );
  }
  if (plugin && plugin.name !== packageJson.name) {
    errors.push(`.claude-plugin/plugin.json name must match package.json name: ${packageJson.name}`);
  }

  // `source` is relative to the repository root, not to .claude-plugin/.
  for (const entry of marketplace?.plugins ?? []) {
    const source = path.resolve(root, entry.source ?? "");
    if (!(await exists(path.join(source, "skills")))) {
      errors.push(`.claude-plugin/marketplace.json plugin "${entry.name}" source has no skills/: ${entry.source}`);
    }
  }
}

async function main() {
  await validateAgent();
  await validateReleasePackaging();
  await validatePluginManifests();

  for (const file of coreTextFiles) {
    const text = await readFile(path.join(root, file), "utf8");
    const hit = mojibakePatterns.find((pattern) => text.includes(pattern));
    if (hit) {
      errors.push(`${file}: contains likely mojibake text: ${hit}`);
    }
  }

  for (const [file, snippets] of expectedKoreanSnippets.entries()) {
    const text = await readFile(path.join(root, file), "utf8");
    for (const snippet of snippets) {
      if (!text.includes(snippet)) {
        errors.push(`${file}: missing expected Korean UTF-8 text: ${snippet}`);
      }
    }
  }

  for (const file of requiredReleaseFiles) {
    if (!(await exists(path.join(root, file)))) {
      errors.push(`missing release file: ${file}`);
    }
  }

  for (const file of forbiddenReleaseFiles) {
    if (await exists(path.join(root, file))) {
      errors.push(`credential configuration file must not be reintroduced: ${file}`);
    }
  }

  if (!(await exists(skillsDir))) {
    errors.push("missing skills/ directory");
  } else {
    const actualSkills = (await readdir(skillsDir)).sort();
    for (const skill of expectedSkills) {
      if (!actualSkills.includes(skill)) {
        errors.push(`missing expected skill: ${skill}`);
      }
    }
    for (const skill of actualSkills) {
      if (!expectedSkills.includes(skill)) {
        errors.push(`unexpected skill directory: ${skill}`);
      }
    }
  }

  for (const skill of expectedSkills) {
    await validateSkill(skill);
  }

  if (errors.length > 0) {
    console.error("Skill validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Skill validation passed: ${expectedSkills.length} skills`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
