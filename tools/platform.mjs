import path from "node:path";
import { pathToFileURL } from "node:url";

export function isMainModule(importMetaUrl) {
  if (!process.argv[1]) return false;
  return importMetaUrl === pathToFileURL(path.resolve(process.argv[1])).href;
}

export function toPosixPath(value) {
  return String(value).replace(/\\/g, "/");
}

export function relativeDisplayPath(from, to) {
  return toPosixPath(path.relative(from, to));
}
