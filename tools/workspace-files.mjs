import path from "node:path";
import { mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export async function workspacePath(root, relative) {
  if (typeof relative !== "string" || !relative || relative.includes("\0")) throw new Error("A workspace path is required");
  const base = await realpath(path.resolve(root));
  const target = path.resolve(base, relative);
  const inside = (value) => { const rel = path.relative(base, value); return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel)); };
  if (!inside(target)) throw new Error("Path must stay inside the workspace");
  let ancestor = target;
  while (true) {
    try {
      if (!inside(await realpath(ancestor))) throw new Error("Symlink leaves the workspace");
      return target;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      ancestor = path.dirname(ancestor);
    }
  }
}

export async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temp, file);
}
