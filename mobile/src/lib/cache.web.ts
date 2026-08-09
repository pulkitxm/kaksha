const PREFIX = "kaksha:";
const WRITE_DELAY_MS = 700;

function storage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = storage()?.getItem(`${PREFIX}${key}`);
    return Promise.resolve(
      raw === null || raw === undefined ? null : (JSON.parse(raw) as T),
    );
  } catch {
    return Promise.resolve(null);
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    return;
  }
}

const queued = new Map<string, unknown>();
let timer: ReturnType<typeof setTimeout> | null = null;

export function flushWrites(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  for (const [key, value] of queued) writeJson(key, value);
  queued.clear();
}

export function writeJsonSoon(key: string, value: unknown): void {
  queued.set(key, value);
  timer ??= setTimeout(flushWrites, WRITE_DELAY_MS);
}
