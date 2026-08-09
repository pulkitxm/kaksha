const STORE_KEY = "kaksha-access-code";

let current: string | null = null;
let onRejected: (() => void) | null = null;

function storage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function accessCode(): string | null {
  return current;
}

export function loadAccessCode(): Promise<string | null> {
  current = storage()?.getItem(STORE_KEY) ?? null;
  return Promise.resolve(current);
}

export function saveAccessCode(code: string): Promise<void> {
  current = code;
  storage()?.setItem(STORE_KEY, code);
  return Promise.resolve();
}

export function clearAccessCode(): Promise<void> {
  current = null;
  storage()?.removeItem(STORE_KEY);
  return Promise.resolve();
}

export function whenAccessRejected(handler: (() => void) | null): void {
  onRejected = handler;
}

export function reportAccessRejected(): void {
  onRejected?.();
}

export function disconnectDevice(): void {
  onRejected?.();
}
