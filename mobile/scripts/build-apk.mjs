import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const androidDir = path.join(projectRoot, "android");
const outputDir = path.join(projectRoot, "build");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: false });
  if (result.error) fail(`Could not run ${command}: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} exited with status ${String(result.status)}`);
}

function has(command) {
  return spawnSync(command, ["-version"], { stdio: "ignore", shell: false }).status === 0;
}

const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;

if (!has("java")) {
  fail(
    [
      "A local APK build needs a JDK on PATH.",
      "",
      "  brew install --cask temurin@17",
      "",
      "Or build in the cloud instead, which needs no local Android toolchain:",
      "",
      "  bun run apk",
    ].join("\n"),
  );
}

if (!sdk) {
  fail(
    [
      "A local APK build needs the Android SDK.",
      "Install Android Studio, then point the environment at it:",
      "",
      '  export ANDROID_HOME="$HOME/Library/Android/sdk"',
      '  export PATH="$ANDROID_HOME/platform-tools:$PATH"',
      "",
      "Or build in the cloud instead:",
      "",
      "  bun run apk",
    ].join("\n"),
  );
}

if (!existsSync(androidDir)) {
  run("bunx", ["expo", "prebuild", "--platform", "android", "--no-install"], projectRoot);
}

const gradlew = path.join(
  androidDir,
  process.platform === "win32" ? "gradlew.bat" : "gradlew",
);
if (!existsSync(gradlew)) fail(`Expected a gradle wrapper at ${gradlew}`);

run(gradlew, ["assembleRelease"], androidDir);

const releaseDir = path.join(androidDir, "app", "build", "outputs", "apk", "release");
if (!existsSync(releaseDir)) fail(`Gradle produced no output at ${releaseDir}`);

const artifacts = readdirSync(releaseDir).filter((name) => name.endsWith(".apk"));
if (artifacts.length === 0) fail(`No apk found in ${releaseDir}`);

mkdirSync(outputDir, { recursive: true });

for (const artifact of artifacts) {
  const destination = path.join(outputDir, artifact);
  copyFileSync(path.join(releaseDir, artifact), destination);
  process.stdout.write(`${destination}\n`);
}
