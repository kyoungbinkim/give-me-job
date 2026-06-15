import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { relativeDisplayPath } from "./platform.mjs";

const root = process.cwd();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function usage() {
  return `Usage:
node tools/init-application.mjs --company <company> --role <role> [--out applications] [--force]
`;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function readTemplate(name) {
  return readFile(path.join(root, "templates", name), "utf8");
}

function render(template, values) {
  return template.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_, key) => values[key] ?? "");
}

async function writeNew(filePath, content, force) {
  try {
    if (!force) {
      await readFile(filePath, "utf8");
      throw new Error(`Refusing to overwrite existing file: ${filePath}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await writeFile(filePath, content, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const company = String(args.company ?? "").trim();
  const role = String(args.role ?? "").trim();
  const out = String(args.out ?? "applications").trim();
  const force = Boolean(args.force);

  if (!company || !role) {
    console.error(usage());
    process.exit(1);
  }

  const slug = slugify(`${company}-${role}`) || `application-${Date.now()}`;
  const packageDir = path.resolve(root, out, slug);
  await mkdir(packageDir, { recursive: true });

  const values = { company, role, slug, packagePath: relativeDisplayPath(root, packageDir) };
  const workflow = render(await readTemplate("workflow-template.md"), values);
  const companyValues = render(await readTemplate("company-values-empty-template.md"), values);

  const files = new Map([
    ["workflow.md", workflow],
    ["jd-analysis.md", render(await readTemplate("jd-analysis-template.md"), values)],
    ["company-values.md", companyValues],
    ["cover-letter-draft.md", render(await readTemplate("cover-letter-template.md"), values)],
    ["hr-review.md", render(await readTemplate("hr-review-template.md"), values)],
    ["cover-letter-final.md", "## Final Cover Letter\n\n"],
    ["evidence-map.md", render(await readTemplate("evidence-map-template.md"), values)],
    ["interview-prep.md", render(await readTemplate("interview-prep-template.md"), values)],
    ["submission-checklist.md", render(await readTemplate("application-package-template.md"), values)],
  ]);

  for (const [fileName, content] of files.entries()) {
    await writeNew(path.join(packageDir, fileName), content, force);
  }

  console.log(`Created application package: ${relativeDisplayPath(root, packageDir)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
