import { Directory, File, Paths } from "expo-file-system";

const store = new Directory(Paths.document, "kaksha");

function fileFor(key: string): File {
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
    store.create({ intermediates: true, idempotent: true });
    fileFor(key).write(JSON.stringify(value));
  } catch {
    return;
  }
}
