import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useRouter } from "expo-router";

import { useToast } from "../src/components/Toast";
import { UpdateCard } from "../src/components/UpdateCard";
import { Button, Card, Chip, IconButton, type IconName } from "../src/components/ui";
import { SPACING, useTheme, useThemeMode, type ThemeMode } from "../src/lib/theme";
import { useAppUpdate } from "../src/lib/update";

const MODES: { key: ThemeMode; label: string; icon: IconName }[] = [
  { key: "system", label: "System", icon: "contrast-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
];

function SectionLabel({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Text style={{ color: theme.fgFaint, fontSize: 11, letterSpacing: 0.8 }}>
      {text.toUpperCase()}
    </Text>
  );
}

export default function Settings() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { mode, setMode } = useThemeMode();
  const appUpdate = useAppUpdate();

  const version = Constants.expoConfig?.version ?? "unknown";
  const buildCode = Constants.expoConfig?.android?.versionCode;
  const installedLine =
    typeof buildCode === "number"
      ? `Kaksha ${version} (build ${String(buildCode)})`
      : `Kaksha ${version}`;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top", "left", "right"]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          borderBottomColor: theme.line,
          borderBottomWidth: StyleSheet.hairlineWidth,
          gap: SPACING.md,
        }}
      >
        <IconButton
          icon="arrow-back"
          label="Back"
          onPress={() => {
            router.back();
          }}
        />
        <Text style={{ color: theme.fg, fontSize: 18, fontWeight: "700" }}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            gap: SPACING.lg,
            width: "100%",
            maxWidth: 560,
            alignSelf: "center",
          }}
        >
          <Card style={{ gap: SPACING.md }}>
            <SectionLabel text="Appearance" />
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              {MODES.map((item) => (
                <Chip
                  key={item.key}
                  label={item.label}
                  icon={item.icon}
                  active={mode === item.key}
                  onPress={() => {
                    setMode(item.key);
                  }}
                />
              ))}
            </View>
            <Text style={{ color: theme.fgMuted, fontSize: 12 }}>
              System follows the device setting.
            </Text>
          </Card>

          <Card style={{ gap: SPACING.md }}>
            <SectionLabel text="Updates" />
            <Text style={{ color: theme.fgMuted, fontSize: 13 }}>{installedLine}</Text>
            <Button
              label="Check for updates"
              icon="cloud-download-outline"
              busy={appUpdate.checking}
              onPress={() => {
                void appUpdate.check().then((outcome) => {
                  if (outcome === "current") {
                    toast("You are on the latest version", "success");
                  }
                  if (outcome === "failed") {
                    toast("Could not check for updates", "error");
                  }
                });
              }}
            />
          </Card>

          <UpdateCard state={appUpdate} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
