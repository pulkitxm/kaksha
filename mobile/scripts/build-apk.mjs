import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const androidDir = path.join(projectRoot, "android");
const outputDir = path.join(projectRoot, "build");

function fail(lines) {
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exit(1);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: false });
  if (result.error) fail([`Could not run ${command}: ${result.error.message}`]);
  if (result.status !== 0)
    fail([`${command} exited with status ${String(result.status)}`]);
}

function hasJava() {
  return spawnSync("java", ["-version"], { stdio: "ignore", shell: false }).status === 0;
}

function looksLikeSdk(candidate) {
  if (!candidate || !existsSync(candidate)) return false;
  return ["platform-tools", "platforms", "cmdline-tools", "build-tools", "licenses"].some(
    (marker) => existsSync(path.join(candidate, marker)),
  );
}

function findSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(homedir(), "Library", "Android", "sdk"),
    path.join(homedir(), "Android", "Sdk"),
    "/usr/local/share/android-sdk",
    "/opt/homebrew/share/android-commandlinetools",
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);

  return candidates.find(looksLikeSdk) ?? null;
}

const CLOUD_HINT = ["", "The cloud build needs none of this:", "", "  bun run apk", ""];

if (!hasJava()) {
  fail([
    "A local APK build needs a JDK 17 on PATH.",
    "",
    "  brew install --cask temurin@17",
    ...CLOUD_HINT,
  ]);
}

const sdk = findSdk();

if (!sdk) {
  const configured = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  const preamble = configured
    ? [
        `ANDROID_HOME points at ${configured}, but there is no Android SDK there.`,
        "Nothing was found at the usual locations either.",
      ]
    : ["No Android SDK found, and ANDROID_HOME is not set."];

  fail([
    ...preamble,
    "",
    "Install the command line tools and the packages a release build needs:",
    "",
    "  brew install --cask android-commandlinetools",
    '  export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"',
    '  sdkmanager --install "platform-tools" "platforms;android-36" "build-tools;36.0.0"',
    "  sdkmanager --licenses",
    "",
    "Android Studio installs the same thing to ~/Library/Android/sdk if you prefer a UI.",
    ...CLOUD_HINT,
  ]);
}

process.stdout.write(`Using Android SDK at ${sdk}\n`);

if (!existsSync(androidDir)) {
  run("bunx", ["expo", "prebuild", "--platform", "android", "--no-install"], projectRoot);
}

writeFileSync(path.join(androidDir, "local.properties"), `sdk.dir=${sdk}\n`);

const gradlew = path.join(
  androidDir,
  process.platform === "win32" ? "gradlew.bat" : "gradlew",
);
if (!existsSync(gradlew)) fail([`Expected a gradle wrapper at ${gradlew}`]);

const architectures = process.env.ANDROID_ABIS ?? "armeabi-v7a,arm64-v8a";

process.stdout.write(`Building for ${architectures}\n`);

run(
  gradlew,
  ["assembleRelease", `-PreactNativeArchitectures=${architectures}`],
  androidDir,
);

const releaseDir = path.join(androidDir, "app", "build", "outputs", "apk", "release");
if (!existsSync(releaseDir)) fail([`Gradle produced no output at ${releaseDir}`]);

const artifacts = readdirSync(releaseDir).filter((name) => name.endsWith(".apk"));
if (artifacts.length === 0) fail([`No apk found in ${releaseDir}`]);

mkdirSync(outputDir, { recursive: true });

for (const artifact of artifacts) {
  const destination = path.join(outputDir, artifact);
  copyFileSync(path.join(releaseDir, artifact), destination);
  process.stdout.write(`\nAPK: ${destination}\n`);
}
