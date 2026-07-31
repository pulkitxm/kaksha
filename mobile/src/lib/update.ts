import { useCallback, useRef, useState } from "react";
import { Linking } from "react-native";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";
import { startActivityAsync } from "expo-intent-launcher";
import { z } from "zod";

const RELEASE_URL = "https://api.github.com/repos/pulkitxm/kaksha/releases/latest";
const CHECK_TIMEOUT_MS = 12000;
const INSTALL_ACTION = "android.intent.action.INSTALL_PACKAGE";
const FLAG_GRANT_READ_URI_PERMISSION = 1;

const releaseSchema = z.object({
  tag_name: z.string(),
  assets: z.array(
    z.object({
      name: z.string(),
      browser_download_url: z.string(),
      size: z.number(),
    }),
  ),
});

type Semver = [number, number, number];

type ReleaseBuild = { semver: Semver; code: number };

type AppUpdate = {
  version: string;
  code: number;
  size: number;
  url: string;
  fileName: string;
};

type CheckOutcome = "update" | "current" | "failed" | "skipped";

type DownloadOutcome = "installing" | "browser" | "failed";

export type AppUpdateController = {
  update: AppUpdate | null;
  checking: boolean;
  downloading: boolean;
  progress: number;
  check: () => Promise<CheckOutcome>;
  download: () => Promise<DownloadOutcome>;
  dismiss: () => void;
};

const TAG_SHAPE = /^mobile-v(\d+)\.(\d+)\.(\d+)-(\d+)$/;
const SEMVER_SHAPE = /^(\d+)\.(\d+)\.(\d+)$/;

function parseTag(tag: string): ReleaseBuild | null {
  const [, major, minor, patch, code] = TAG_SHAPE.exec(tag) ?? [];
  if (!major || !minor || !patch || !code) return null;
  return {
    semver: [Number(major), Number(minor), Number(patch)],
    code: Number(code),
  };
}

function parseSemver(value: string): Semver | null {
  const [, major, minor, patch] = SEMVER_SHAPE.exec(value) ?? [];
  if (!major || !minor || !patch) return null;
  return [Number(major), Number(minor), Number(patch)];
}

function compareSemver(a: Semver, b: Semver): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

function newerThanInstalled(release: ReleaseBuild): boolean {
  const config = Constants.expoConfig;
  const installed = config?.version ? parseSemver(config.version) : null;
  if (!installed) return false;
  const bySemver = compareSemver(release.semver, installed);
  if (bySemver !== 0) return bySemver > 0;
  const installedCode = config?.android?.versionCode;
  return typeof installedCode === "number" && release.code > installedCode;
}

async function fetchAvailableUpdate(signal: AbortSignal): Promise<AppUpdate | null> {
  const response = await fetch(RELEASE_URL, {
    signal,
    headers: { accept: "application/vnd.github+json" },
  });
  if (!response.ok) return null;
  const release = releaseSchema.parse(await response.json());
  const build = parseTag(release.tag_name);
  const asset = release.assets.find((entry) => entry.name.endsWith(".apk"));
  if (!build || !asset || !newerThanInstalled(build)) return null;
  return {
    version: build.semver.join("."),
    code: build.code,
    size: asset.size,
    url: asset.browser_download_url,
    fileName: asset.name,
  };
}

export function useAppUpdate(): AppUpdateController {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const checkBusy = useRef(false);
  const busy = useRef(false);

  const check = useCallback(async (): Promise<CheckOutcome> => {
    if (checkBusy.current) return "skipped";
    checkBusy.current = true;
    setChecking(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, CHECK_TIMEOUT_MS);
    try {
      const found = await fetchAvailableUpdate(controller.signal);
      setUpdate(found);
      setDismissed(false);
      return found ? "update" : "current";
    } catch {
      return "failed";
    } finally {
      clearTimeout(timer);
      checkBusy.current = false;
      setChecking(false);
    }
  }, []);

  const download = useCallback(async (): Promise<DownloadOutcome> => {
    if (!update || busy.current) return "installing";
    busy.current = true;
    setDownloading(true);
    setProgress(0);
    try {
      const target = new File(Paths.cache, update.fileName);
      if (!(target.exists && target.size === update.size)) {
        await File.downloadFileAsync(update.url, target, {
          idempotent: true,
          onProgress: ({ bytesWritten, totalBytes }) => {
            const total = totalBytes > 0 ? totalBytes : update.size;
            if (total > 0) setProgress(Math.min(bytesWritten / total, 1));
          },
        });
      }
      setProgress(1);
      const contentUri = await getContentUriAsync(target.uri);
      await startActivityAsync(INSTALL_ACTION, {
        data: contentUri,
        flags: FLAG_GRANT_READ_URI_PERMISSION,
      });
      return "installing";
    } catch {
      return Linking.openURL(update.url).then(
        () => "browser" as const,
        () => "failed" as const,
      );
    } finally {
      busy.current = false;
      setDownloading(false);
    }
  }, [update]);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    update: dismissed ? null : update,
    checking,
    downloading,
    progress,
    check,
    download,
    dismiss,
  };
}
