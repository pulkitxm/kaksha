import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { type AppUpdateController } from "../lib/update";
import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { useToast } from "./Toast";
import { Button, Card, IconButton } from "./ui";

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UpdateCard({ state }: { state: AppUpdateController }) {
  const theme = useTheme();
  const toast = useToast();
  const { update, downloading, progress, download, dismiss } = state;

  if (!update) return null;

  const percent = Math.round(progress * 100);

  return (
    <Animated.View entering={FadeInDown.duration(240)}>
      <Card style={{ gap: SPACING.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: RADIUS.pill,
              backgroundColor: `${theme.accent}22`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="cloud-download-outline" size={19} color={theme.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.fg, fontSize: 15, fontWeight: "700" }}>
              Update available
            </Text>
            <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 1 }}>
              {`Kaksha ${update.version} (build ${String(update.code)}) · ${formatSize(update.size)}`}
            </Text>
          </View>
          {downloading ? null : (
            <IconButton icon="close" label="Dismiss update" onPress={dismiss} size={16} />
          )}
        </View>
        {downloading ? (
          <View style={{ gap: SPACING.xs }}>
            <View
              style={{
                height: 6,
                borderRadius: RADIUS.pill,
                backgroundColor: theme.bgSubtle,
                overflow: "hidden",
                flexDirection: "row",
              }}
            >
              <View
                style={{
                  flex: percent,
                  backgroundColor: theme.accent,
                  borderRadius: RADIUS.pill,
                }}
              />
              <View style={{ flex: 100 - percent }} />
            </View>
            <Text style={{ color: theme.fgFaint, fontSize: 11 }}>
              {`Downloading · ${String(percent)}%`}
            </Text>
          </View>
        ) : (
          <Button
            label="Download and install"
            variant="primary"
            icon="download-outline"
            onPress={() => {
              void download().then((outcome) => {
                if (outcome === "browser") {
                  toast("Finishing the download in the browser", "info");
                }
                if (outcome === "failed") {
                  toast("Could not download the update", "error");
                }
              });
            }}
          />
        )}
      </Card>
    </Animated.View>
  );
}
