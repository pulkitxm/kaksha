import { useCallback } from "react";

import { type AppUpdateController } from "./update";

export type { AppUpdateController };

export function useAppUpdate(): AppUpdateController {
  const check = useCallback(() => Promise.resolve("skipped" as const), []);
  const download = useCallback(() => Promise.resolve("failed" as const), []);
  const dismiss = useCallback(() => undefined, []);

  return {
    update: null,
    checking: false,
    downloading: false,
    progress: 0,
    check,
    download,
    dismiss,
  };
}
