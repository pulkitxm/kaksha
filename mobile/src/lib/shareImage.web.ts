import { type ShareOutcome } from "./shareImage";

export type { ShareOutcome };

export function shareImage(
  uri: string,
  { fileName }: { title: string; fileName: string },
): Promise<ShareOutcome> {
  const anchor = document.createElement("a");
  anchor.href = uri;
  anchor.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return Promise.resolve("downloaded");
}
