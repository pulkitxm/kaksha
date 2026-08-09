import * as Sharing from "expo-sharing";

export type ShareOutcome = "shared" | "downloaded" | "unavailable";

export async function shareImage(
  uri: string,
  { title }: { title: string; fileName: string },
): Promise<ShareOutcome> {
  if (!(await Sharing.isAvailableAsync())) return "unavailable";
  await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: title });
  return "shared";
}
