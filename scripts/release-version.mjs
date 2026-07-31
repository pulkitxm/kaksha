import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const appConfigPath = path.join("mobile", "app.json");
const appConfig = JSON.parse(readFileSync(appConfigPath, "utf8"));

const version = appConfig.expo.version ?? "0.0.0";
const code = Number(process.env.GITHUB_RUN_NUMBER ?? "1");

appConfig.expo.android = { ...appConfig.expo.android, versionCode: code };
writeFileSync(appConfigPath, `${JSON.stringify(appConfig, null, 2)}\n`);

const tag = `mobile-v${version}-${String(code)}`;
const artifact = `kaksha-${version}-${String(code)}.apk`;

process.stdout.write(`version ${version}, versionCode ${String(code)}, tag ${tag}\n`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `version=${version}\ncode=${String(code)}\ntag=${tag}\nartifact=${artifact}\n`,
  );
}
