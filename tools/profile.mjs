import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function writeWorkspaceJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

const profileArrays = ["roles", "locations", "employmentTypes", "excludedKeywords"];

function defaultProfile() {
  return { roles: [], locations: [], employmentTypes: [], excludedKeywords: [], timezone: "Asia/Seoul" };
}

export async function getProfile({ root = process.cwd() } = {}) {
  let stored;
  try { stored = JSON.parse(await readFile(path.join(root, "data/profile.json"), "utf8")); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    return defaultProfile();
  }
  // A hand-written or partial profile file must not leave callers without the list
  // fields they read, so stored values are merged over the defaults.
  const profile = { ...defaultProfile(), ...(stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}) };
  for (const key of profileArrays) if (!Array.isArray(profile[key])) profile[key] = [];
  return profile;
}

export async function setProfile(patch, { root = process.cwd() } = {}) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("Profile must be an object.");
  for (const [key, value] of Object.entries(patch)) {
    if (!["roles", "locations", "employmentTypes", "excludedKeywords", "timezone"].includes(key)) throw new Error(`Unknown profile field: ${key}`);
    if (key === "timezone") new Intl.DateTimeFormat("en", { timeZone: value });
    else if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error(`${key} must be a string array.`);
  }
  const profile = { ...await getProfile({ root }), ...patch };
  await writeWorkspaceJson(path.join(root, "data/profile.json"), profile);
  return profile;
}
