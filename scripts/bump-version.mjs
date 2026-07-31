import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PARTS = new Set(["patch", "minor", "major"]);

const requested = process.argv[2] ?? "patch";

if (!PARTS.has(requested)) {
  process.stderr.write(`Unknown bump "${requested}". Use patch, minor or major.\n`);
  process.exit(1);
}

const appConfigPath = path.join("mobile", "app.json");
const packagePath = path.join("mobile", "package.json");

const appConfig = JSON.parse(readFileSync(appConfigPath, "utf8"));
const appPackage = JSON.parse(readFileSync(packagePath, "utf8"));

const current = appConfig.expo.version ?? "0.0.0";
const parsed = current.split(".").map((part) => Number.parseInt(part, 10));

if (parsed.length !== 3 || parsed.some((part) => Number.isNaN(part))) {
  process.stderr.write(`Cannot parse version "${current}" from ${appConfigPath}\n`);
  process.exit(1);
}

const major = Number(parsed[0]);
const minor = Number(parsed[1]);
const patch = Number(parsed[2]);

const next =
  requested === "major"
    ? [major + 1, 0, 0]
    : requested === "minor"
      ? [major, minor + 1, 0]
      : [major, minor, patch + 1];

const version = next.join(".");
const code = Number(appConfig.expo.android?.versionCode ?? 0) + 1;

appConfig.expo.version = version;
appConfig.expo.android = { ...appConfig.expo.android, versionCode: code };
appPackage.version = version;

writeFileSync(appConfigPath, `${JSON.stringify(appConfig, null, 2)}\n`);
writeFileSync(packagePath, `${JSON.stringify(appPackage, null, 2)}\n`);

process.stdout.write(`${current} -> ${version} (versionCode ${String(code)})\n`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `version=${version}\ncode=${String(code)}\nprevious=${current}\n`,
  );
}
