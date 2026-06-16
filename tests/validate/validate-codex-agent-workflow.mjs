import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { skillNames } from "../../tools/skill-registry.mjs";

const root = process.cwd();
const cli = path.join(root, "tools", "give-me-job-cli.mjs");
const agentFile = path.join(root, "agent.md");
const agentsFile = path.join(root, "AGENTS.md");
const fixturePackage = path.join(root, "tests", "fixtures", "workflows", "lg-electronics-backend");

const workflowSkills = [
  "resume-intake",
  "jd-analyzer",
  "company-values-analyzer",
  "cover-letter-writer",
  "hr-reviewer",
  "interview-prep",
  "application-packager",
];

const requiredPackageFiles = [
  "workflow.md",
  "jd-analysis.md",
  "company-values.md",
  "cover-letter-draft.md",
  "hr-review.md",
  "cover-letter-final.md",
  "evidence-map.md",
  "interview-prep.md",
  "submission-checklist.md",
];

const workflowHeadings = [
  "### 1. Intake",
  "### 2. Resume Source",
  "### 3. JD Analysis",
  "### 4. Company Values",
  "### 5. Draft Cover Letter",
  "### 6. HR Review",
  "### 7. Final Text",
  "### 8. Interview Prep",
  "### 9. Application Package",
];

const statusValues = [
  "intake",
  "resume-needed",
  "jd-analyzed",
  "drafted",
  "review-blocked",
  "ready-for-user-review",
  "submitted-by-user",
  "paused",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}

function assertInOrder(text, snippets, label) {
  let previous = -1;
  for (const snippet of snippets) {
    const current = text.indexOf(snippet);
    assert(current >= 0, `${label} missing ordered snippet: ${snippet}`);
    assert(current > previous, `${label} has out-of-order snippet: ${snippet}`);
    previous = current;
  }
}

function parseTomlJsonString(text, key) {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"));
  assert(match, `Codex agent TOML missing key: ${key}`);
  return JSON.parse(match[1]);
}

function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    encoding: "utf8",
  });
}

async function validateCodexInstall(agentText) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "give-me-job-codex-agent-"));
  const home = path.join(temp, "home");
  const project = path.join(temp, "project");

  try {
    await mkdir(project, { recursive: true });
    const install = runNode([cli, "install", "--target", "codex", "--scope", "project"], {
      cwd: project,
      env: { ...process.env, GIVE_ME_JOB_HOME: home },
    });
    assert(install.status === 0, `Codex project install failed:\n${install.stderr || install.stdout}`);

    const codexAgentFile = path.join(project, ".codex", "agents", "give-me-job.toml");
    const codexAgent = await readFile(codexAgentFile, "utf8");
    assert(parseTomlJsonString(codexAgent, "name") === "give-me-job", "Codex agent name must be give-me-job");
    assertIncludes(
      parseTomlJsonString(codexAgent, "description"),
      "Korea-only give-me-job application workflow",
      "Codex agent description",
    );
    assert(
      parseTomlJsonString(codexAgent, "developer_instructions") === agentText,
      "Codex developer_instructions must exactly mirror agent.md",
    );

    for (const skill of skillNames) {
      assert(
        await exists(path.join(project, ".agents", "skills", skill, "SKILL.md")),
        `Codex install missing skill: ${skill}`,
      );
    }
    assert(
      !(await exists(path.join(project, ".agents", "skills", "give-me-job", "SKILL.md"))),
      "Codex install should use .codex/agents/give-me-job.toml instead of a legacy orchestrator skill",
    );
    assert(
      await exists(path.join(project, ".codex", "give-me-job", "agent.md")),
      "Codex install missing support bundle agent.md",
    );
    assert(
      await exists(path.join(project, ".codex", "give-me-job", "support", "validate", "validate-application.mjs")),
      "Codex install missing support validation bundle",
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

function validateRepositoryInstructions(agentsText) {
  assertIncludes(agentsText, "Korea-only job-application package generator", "AGENTS.md");
  assertIncludes(agentsText, "not as an automatic application submitter", "AGENTS.md");
  assertIncludes(agentsText, "Read `agent.md` first", "AGENTS.md");
  assertIncludes(agentsText, "Create or update one package under `applications/<company-role>/`", "AGENTS.md");
  assertIncludes(agentsText, "Keep all strong cover-letter claims grounded in `resume.md`", "AGENTS.md");
  assertIncludes(agentsText, "Stop when evidence is missing", "AGENTS.md");

  for (const skill of workflowSkills) {
    assertIncludes(agentsText, `skills/${skill}/SKILL.md`, "AGENTS.md skill routing");
  }
}

function validateAgentOrchestration(agentText) {
  assertIncludes(agentText, "# give-me-job Agent", "agent.md");
  assertIncludes(agentText, "Use it when the user wants to run the whole Korean application-preparation flow", "agent.md");
  assertIncludes(agentText, "Do not run this agent for final submission", "agent.md");
  assertIncludes(agentText, "Never invent experience", "agent.md");
  assertIncludes(agentText, "Every strong cover-letter claim must be backed by `resume.md`", "agent.md");
  assertIncludes(agentText, "Company values are optional context", "agent.md");
  assertIncludes(agentText, "The user must review and submit the final application manually", "agent.md");

  assertInOrder(agentText, workflowHeadings, "agent.md workflow");

  for (const skill of workflowSkills) {
    assertIncludes(agentText, `skills/${skill}/SKILL.md`, "agent.md workflow skill");
  }
  for (const file of requiredPackageFiles) {
    assertIncludes(agentText, file, "agent.md package file");
  }
  for (const status of statusValues) {
    assertIncludes(agentText, `- \`${status}\``, "agent.md workflow status");
  }

  for (const stopCondition of [
    "no JD or target role is available",
    "no usable `resume.md` evidence exists",
    "a required cover letter question is missing",
    "the HR review finds a blocker",
    "submit, send, log in, bypass CAPTCHA, or transmit personal information",
  ]) {
    assertIncludes(agentText, stopCondition, "agent.md stop conditions");
  }

  assertIncludes(agentText, "## Non-Interactive Fallback", "agent.md");
  assertIncludes(agentText, "Status: resume-needed", "agent.md non-interactive fallback");
  assertIncludes(agentText, "Status: intake", "agent.md non-interactive fallback");
  assertIncludes(agentText, "Status: paused", "agent.md non-interactive fallback");
  assertIncludes(agentText, "Status: review-blocked", "agent.md non-interactive fallback");
}

async function validateWorkflowFixture() {
  const validation = runNode(["support/validate/validate-application.mjs", "tests/fixtures/workflows/lg-electronics-backend"]);
  assert(validation.status === 0, `fixture package validation failed:\n${validation.stderr || validation.stdout}`);

  const files = Object.fromEntries(
    await Promise.all(
      requiredPackageFiles.map(async (file) => [file, await readFile(path.join(fixturePackage, file), "utf8")]),
    ),
  );

  for (const file of requiredPackageFiles) {
    assert(files[file].trim().length > 0, `${file} fixture is empty`);
  }

  assertIncludes(files["workflow.md"], "- Company: LG전자", "workflow fixture");
  assertIncludes(files["workflow.md"], "- Status: ready-for-user-review", "workflow fixture");
  assertIncludes(files["workflow.md"], "- Manual Submission Notes: User must review and submit manually.", "workflow fixture");

  for (const step of [
    "Intake",
    "Resume Evidence",
    "JD Analysis",
    "Company Values",
    "Draft",
    "HR Review",
    "Final Text",
    "Interview Prep",
    "Package",
  ]) {
    assertIncludes(files["workflow.md"], `| ${step} | done |`, "workflow fixture step log");
  }

  assertIncludes(files["hr-review.md"].replace(/\r\n/g, "\n"), "- Blockers:\n  - None", "HR review fixture");
  assertIncludes(files["submission-checklist.md"], "Submit manually", "submission checklist fixture");
  assertIncludes(files["submission-checklist.md"], "not submitted by the agent", "submission checklist fixture");

  for (const evidenceId of ["E1", "E2"]) {
    assertIncludes(files["evidence-map.md"], evidenceId, "evidence map fixture");
    assertIncludes(files["cover-letter-draft.md"], evidenceId, "draft fixture evidence trace");
    assertIncludes(files["interview-prep.md"], evidenceId, "interview prep fixture evidence trace");
  }
}

async function main() {
  const [agentsText, agentText] = await Promise.all([
    readFile(agentsFile, "utf8"),
    readFile(agentFile, "utf8"),
  ]);

  validateRepositoryInstructions(agentsText);
  validateAgentOrchestration(agentText);
  await validateCodexInstall(agentText);
  await validateWorkflowFixture();

  console.log("Codex agent workflow validation passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
