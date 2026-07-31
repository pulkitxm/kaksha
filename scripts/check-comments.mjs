import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const ALLOWED = [
  /^\/\/\s*eslint-(disable|enable)/,
  /^\/\/\s*@ts-(expect-error|ignore|nocheck)/,
  /^\/\/\s*biome-ignore/,
  /^\/\/\s*prettier-ignore/,
  /^\/\/\s*#!/,
  /^\/\*!/,
  /^\/\*\*?\s*global/,
  /^\/\/\/\s*<reference/,
];

const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
]);

const IGNORED_PREFIXES = [
  "node_modules/",
  "core/dist/",
  "server/dist/",
  "server/drizzle/",
  "mobile/.expo/",
  "scripts/check-comments.mjs",
];

function listFiles() {
  const output = execFileSync("git", ["ls-files"], { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => EXTENSIONS.has(file.slice(file.lastIndexOf("."))))
    .filter((file) => !IGNORED_PREFIXES.some((prefix) => file.startsWith(prefix)))
    .filter((file) => existsSync(file));
}

function isAllowed(text) {
  return ALLOWED.some((pattern) => pattern.test(text.trim()));
}

function scan(file) {
  const source = readFileSync(file, "utf8");
  const findings = [];

  let inBlock = false;
  let blockAllowed = false;
  let inString = null;
  let inTemplate = false;

  const lines = source.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (index === 0 && line.startsWith("#!")) continue;

    for (let column = 0; column < line.length; column += 1) {
      const char = line[column];
      const next = line[column + 1];
      const previous = column > 0 ? line[column - 1] : "";

      if (inBlock) {
        if (char === "*" && next === "/") {
          inBlock = false;
          column += 1;
        }
        continue;
      }

      if (inString) {
        if (char === inString && previous !== "\\") inString = null;
        continue;
      }

      if (inTemplate) {
        if (char === "`" && previous !== "\\") inTemplate = false;
        continue;
      }

      if (char === '"' || char === "'") {
        inString = char;
        continue;
      }

      if (char === "`") {
        inTemplate = true;
        continue;
      }

      if (char === "/" && next === "/") {
        const rest = line.slice(column);
        if (!isAllowed(rest)) {
          findings.push({ line: index + 1, text: rest.trim().slice(0, 90) });
        }
        break;
      }

      if (char === "/" && next === "*") {
        const rest = line.slice(column);
        blockAllowed = isAllowed(rest);
        if (!blockAllowed) {
          findings.push({ line: index + 1, text: rest.trim().slice(0, 90) });
        }
        inBlock = !line.slice(column + 2).includes("*/");
        column += 1;
      }
    }
  }

  return findings;
}

const files = listFiles();
let total = 0;

for (const file of files) {
  const findings = scan(file);
  for (const finding of findings) {
    total += 1;
    process.stdout.write(`${file}:${finding.line}: ${finding.text}\n`);
  }
}

if (total > 0) {
  process.stdout.write(
    `\n::error::${total} disallowed comment(s) found. Names and structure must carry the meaning. Only functional directives (eslint-*, @ts-*, biome-ignore, prettier-ignore, license blocks) are permitted.\n`,
  );
  process.exit(1);
}

process.stdout.write(`No disallowed comments in ${files.length} files.\n`);
