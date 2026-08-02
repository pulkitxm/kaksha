import * as SecureStore from "expo-secure-store";

const STORE_KEY = "kaksha-access-code";

let current: string | null = null;
let onRejected: (() => void) | null = null;

export function accessCode(): string | null {
  return current;
}

export async function loadAccessCode(): Promise<string | null> {
  try {
    current = await SecureStore.getItemAsync(STORE_KEY);
  } catch {
    current = null;
  }
  return current;
}

export async function saveAccessCode(code: string): Promise<void> {
  current = code;
  await SecureStore.setItemAsync(STORE_KEY, code);
}

export async function clearAccessCode(): Promise<void> {
  current = null;
  await SecureStore.deleteItemAsync(STORE_KEY);
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
