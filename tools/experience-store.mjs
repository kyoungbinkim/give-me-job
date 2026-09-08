import { readFile } from "node:fs/promises";

export function extractExperiences(markdown) {
  const experiences = [];
  const lines = markdown.split(/\r?\n/);
  let section = "";
  let entry = "";
  for (const [index, line] of lines.entries()) {
    const heading = /^(#{2,4})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      if (heading[1].length === 2) section = heading[2];
      else entry = heading[2];
    }
    for (const match of line.matchAll(/\b(?:E|EV|EXP)-[A-Za-z0-9_-]+\b/g)) {
      if (!experiences.some((item) => item.id === match[0])) experiences.push({ id: match[0], source: { section, entry, line: index + 1 }, text: line.trim() });
    }
  }
  return experiences;
}

export async function getExperiences(resumePath) {
  return extractExperiences(await readFile(resumePath, "utf8"));
}
