import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateApplication } from "../../tools/application-state.mjs";

export { validateApplication };

async function main() {
  const argv = process.argv.slice(2);
  const target = argv[0];
  if (!target) throw new Error("Usage: node support/validate/validate-application.mjs <package-dir> [--mode structure|ready] [--resume path] [--format json]");
  const option = (name) => {
    const index = argv.indexOf(name);
    if (index < 0) return undefined;
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
    return value;
  };
  const result = await validateApplication(path.resolve(target), {
    mode: argv.includes("--mode") ? option("--mode") : "structure",
    resumePath: argv.includes("--resume") ? path.resolve(option("--resume")) : undefined,
    writeState: argv.includes("--mode") && option("--mode") === "ready",
  });
  if (argv.includes("--format") && option("--format") === "json") console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Application validation ${result.ok ? "passed" : "failed"} (${result.mode})`);
    for (const error of result.errors) console.error(`- ${error}`);
    for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
  }
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
