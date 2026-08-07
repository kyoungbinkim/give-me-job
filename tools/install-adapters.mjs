import path from "node:path";
import { readFile } from "node:fs/promises";
import { supportRootFor } from "./install-layout.mjs";

export const agentName = "give-me-job";
export const agentDescription =
  "Run the Korea-only give-me-job application workflow. Use when preparing a company-specific Korean job application package from resume.md, a JD, and optional company values while never submitting, logging in, bypassing CAPTCHA, or transmitting personal information.";

export const workflowTools = [
  {
    name: "fetch-jobs",
    script: "tools/fetch-jobs.mjs",
    description: "Fetch and normalize job postings through give-me-job job-source adapters. TODO: no sources are registered yet.",
    hint: "--source <source> [--fixture <path>] [--dry-run]",
    allowedFlags: [
      "--help",
      "--source",
      "--fixture",
      "--out",
      "--date",
      "--dry-run",
      "--keywords",
      "--deadline",
      "--count",
    ],
    allowedFlagPrefixes: ["--param."],
    blockedFlags: ["--endpoint", "--company-endpoint", "--auth-key", "--access-key"],
    pathFlags: ["--fixture", "--out"],
  },
  {
    name: "init-application",
    script: "tools/init-application.mjs",
    description: "Create a company-role Korean application package folder from give-me-job templates.",
    hint: "--company <company> --role <role> [--out applications] [--force]",
    allowedFlags: ["--help", "--company", "--role", "--out", "--force"],
    allowedFlagPrefixes: [],
    blockedFlags: [],
    pathFlags: ["--out"],
  },
  {
    name: "schedule-jobs",
    script: "tools/schedule-jobs.mjs",
    description: "Summarize today, tomorrow, or weekly deadlines from normalized job files.",
    hint: "[--today|--tomorrow|--week] [--jobs data/jobs]",
    allowedFlags: ["--help", "--today", "--tomorrow", "--week", "--jobs", "--format", "--today-date"],
    allowedFlagPrefixes: [],
    blockedFlags: [],
    pathFlags: ["--jobs"],
  },
  {
    name: "rank-jobs",
    script: "tools/rank-jobs.mjs",
    description: "Rank normalized job postings against a resume.md source file.",
    hint: "--resume resume.md --jobs data/jobs",
    allowedFlags: ["--help", "--resume", "--jobs", "--today-date", "--format"],
    allowedFlagPrefixes: [],
    blockedFlags: [],
    pathFlags: ["--resume", "--jobs"],
  },
];

// `job-searcher` guides the user to supply a JD or posting URL; it runs no
// script of its own, so it gets read-only tools and no Bash access.
export const jobSearcherAllowedTools = "Read, Grep";

export function sourceForTarget(target, source) {
  if (target !== "claude-code" || source.kind !== "domain-skill" || source.skillName !== "job-searcher" || source.relativePath !== "SKILL.md") {
    return source;
  }

  const text = source.content.toString("utf8");
  if (text.includes("\nallowed-tools:")) return source;
  const content = text.replace(/^---\r?\n/, `---\nallowed-tools: ${jobSearcherAllowedTools}\n`);
  return { ...source, content: Buffer.from(content, "utf8") };
}

export function claudeAllowedTools(toolSpec) {
  const scriptName = path.basename(toolSpec.script);
  return `Bash(node *${scriptName}), Bash(node *${scriptName} *), Read, Grep`;
}

function claudeToolSkillContent(toolSpec, scriptPath) {
  return [
    "---",
    `name: give-me-job-${toolSpec.name}`,
    `description: ${toolSpec.description}`,
    `allowed-tools: ${claudeAllowedTools(toolSpec)}`,
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
import path from "node:path";

const scriptPath = ${JSON.stringify(scriptPath)};
const toolPolicy = ${JSON.stringify(
    {
      allowedFlags: toolSpec.allowedFlags ?? [],
      allowedFlagPrefixes: toolSpec.allowedFlagPrefixes ?? [],
      blockedFlags: toolSpec.blockedFlags ?? [],
      pathFlags: toolSpec.pathFlags ?? [],
    },
    null,
    2,
  )};

function flagName(arg) {
  return arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
}

function assertInsideBase(rawPath, baseDir, flag) {
  if (!rawPath || rawPath.startsWith("-")) {
    throw new Error(\`Missing path value for \${flag}\`);
  }
  if (rawPath.includes("\\u0000")) {
    throw new Error(\`Invalid path value for \${flag}\`);
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBase, rawPath);
  const relative = path.relative(resolvedBase, resolvedPath);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return;
  }

  throw new Error(\`Path for \${flag} must stay inside the current workspace\`);
}

function validateArgs(rawArgs, context) {
  const args = rawArgs ?? [];
  if (!Array.isArray(args)) {
    throw new Error("args must be an array of strings");
  }

  const baseDir = context?.directory ?? process.cwd();
  const allowedFlags = new Set(toolPolicy.allowedFlags);
  const blockedFlags = new Set(toolPolicy.blockedFlags);
  const pathFlags = new Set(toolPolicy.pathFlags);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (typeof arg !== "string" || arg.includes("\\u0000")) {
      throw new Error("Each argument must be a string without null bytes");
    }
    if (!arg.startsWith("--")) {
      continue;
    }

    const name = flagName(arg);
    const hasAllowedPrefix = toolPolicy.allowedFlagPrefixes.some((prefix) => name.startsWith(prefix));
    if (blockedFlags.has(name)) {
      throw new Error(\`Flag \${name} is not available through the OpenCode custom tool\`);
    }
    if (!allowedFlags.has(name) && !hasAllowedPrefix) {
      throw new Error(\`Unknown or unsupported flag: \${name}\`);
    }

    if (pathFlags.has(name)) {
      const inlineValue = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : undefined;
      const pathValue = inlineValue ?? args[index + 1];
      assertInsideBase(pathValue, baseDir, name);
    }
  }

  return args;
}

function runNode(args, context) {
  return new Promise((resolve) => {
    let validatedArgs;
    try {
      validatedArgs = validateArgs(args.args ?? [], context);
    } catch (error) {
      resolve(JSON.stringify({ success: false, validationError: error.message }, null, 2));
      return;
    }

    const child = spawn("node", [scriptPath, ...validatedArgs], {
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

export function generatedSourcesForTarget(target, scope) {
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

export async function readAgentSource(target, packageRoot) {
  const agent = await readFile(path.join(packageRoot, "agent.md"), "utf8");
  if (target === "codex") {
    const content = `name = ${JSON.stringify(agentName)}\ndescription = ${JSON.stringify(agentDescription)}\ndeveloper_instructions = ${JSON.stringify(agent)}\n`;
    return {
      kind: "agent",
      skillName: agentName,
      relativePath: `${agentName}.toml`,
      content: Buffer.from(content, "utf8"),
    };
  }

  if (target === "claude-code") {
    const content = `---\nname: ${agentName}\ndescription: ${agentDescription}\ntools: Read, Write, Edit, Glob, Grep\nmodel: inherit\n---\n\n${agent}`;
    return {
      kind: "agent",
      skillName: agentName,
      relativePath: `${agentName}.md`,
      content: Buffer.from(content, "utf8"),
    };
  }

  const content = `---\ndescription: ${agentDescription}\nmode: primary\npermission:\n  edit: allow\n  bash: allow\n  webfetch: allow\n  skill: allow\n---\n\n${agent}`;
  return {
    kind: "agent",
    skillName: agentName,
    relativePath: `${agentName}.md`,
    content: Buffer.from(content, "utf8"),
  };
}
