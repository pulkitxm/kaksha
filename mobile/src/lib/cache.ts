import { Directory, File, Paths } from "expo-file-system";

let store: Directory | null = null;

function fileFor(key: string): File {
  store ??= new Directory(Paths.document, "kaksha");
  return new File(store, `${key}.json`);
}

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const file = fileFor(key);
    if (!file.exists) return null;
    return JSON.parse(await file.text()) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    const file = fileFor(key);
    store?.create({ intermediates: true, idempotent: true });
    file.write(JSON.stringify(value));
  } catch {
    return;
  }
}
