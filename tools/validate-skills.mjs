import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const skillsDir = path.join(root, "skills");
const agentFile = path.join(root, "agent.md");
const agentsFile = path.join(root, "AGENTS.md");
const expectedSkills = [
  "resume-intake",
  "jd-analyzer",
  "company-values-analyzer",
  "cover-letter-writer",
  "hr-reviewer",
  "application-packager",
];
const bannedDocs = new Set([
  "README.md",
  "INSTALL.md",
  "INSTALLATION_GUIDE.md",
  "QUICK_REFERENCE.md",
  "CHANGELOG.md",
]);
const requiredReleaseFiles = [
  "docs/quickstart.md",
  "docs/safety.md",
  "docs/release-checklist.md",
  "templates/workflow-template.md",
  "templates/company-values-empty-template.md",
  "tools/init-application.mjs",
  "tools/validate-application.mjs",
  "examples/demo-new-grad-backend/applications/demo-cloud-backend/workflow.md",
  "examples/demo-new-grad-backend/applications/demo-cloud-backend/evidence-map.md",
  "examples/demo-new-grad-backend/applications/demo-cloud-backend/hr-review.md",
  "examples/demo-new-grad-backend/applications/demo-cloud-backend/cover-letter-final.md",
];

const errors = [];

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
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

  if (["cover-letter-writer", "hr-reviewer", "application-packager"].includes(skillName)) {
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

async function main() {
  await validateAgent();

  for (const file of requiredReleaseFiles) {
    if (!(await exists(path.join(root, file)))) {
      errors.push(`missing release file: ${file}`);
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
