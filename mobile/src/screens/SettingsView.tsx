import { useState } from "react";
import { Platform, Text, View } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { UpdateCard } from "../components/UpdateCard";
import { Button, Card, Chip, ScreenHeading, type IconName } from "../components/ui";
import { disconnectDevice } from "../lib/access";
import { useLog } from "../lib/log";
import { useStore } from "../lib/store";
import { SPACING, useTheme, useThemeMode, type ThemeMode } from "../lib/theme";
import { useAppUpdate } from "../lib/update";

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

export function SettingsView() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { mode, setMode } = useThemeMode();
  const appUpdate = useAppUpdate();
  const { sync } = useStore();
  const entries = useLog();
  const [disconnecting, setDisconnecting] = useState(false);

  const version = Constants.expoConfig?.version ?? "unknown";
  const buildCode = Constants.expoConfig?.android?.versionCode;
  const installedLine =
    typeof buildCode === "number"
      ? `Kaksha ${version} (build ${String(buildCode)})`
      : `Kaksha ${version}`;

  const errorCount = entries.filter((entry) => entry.level === "error").length;

  const syncLine = sync.syncing
    ? "Syncing now"
    : sync.pending > 0
      ? `${String(sync.pending)} changes are waiting to be sent`
      : sync.offline
        ? "Cannot reach the server, showing the saved copy"
        : "Everything on this device matches the server";

  return (
    <View>
      <ScreenHeading title="Settings" hint="How the app looks and how it keeps in step" />

      <View style={{ gap: SPACING.lg, width: "100%", maxWidth: 640 }}>
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
          <SectionLabel text="Sync" />
          <Text style={{ color: theme.fgMuted, fontSize: 13 }}>{syncLine}</Text>
          <Button
            label="Sync status"
            icon="cloud-outline"
            onPress={() => {
              router.push("/sync");
            }}
          />
        </Card>

        <Card style={{ gap: SPACING.md }}>
          <SectionLabel text={Platform.OS === "web" ? "About" : "Updates"} />
          <Text style={{ color: theme.fgMuted, fontSize: 13 }}>{installedLine}</Text>
          {Platform.OS === "web" ? null : (
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
          )}
        </Card>

        <Card style={{ gap: SPACING.md }}>
          <SectionLabel text="Diagnostics" />
          <Text style={{ color: theme.fgMuted, fontSize: 13 }}>
            {errorCount > 0
              ? `${String(errorCount)} things have gone wrong on this device.`
              : "A record of what the app has been doing, useful when something looks wrong."}
          </Text>
          <Button
            label="View logs"
            icon="document-text-outline"
            onPress={() => {
              router.push("/logs");
            }}
          />
        </Card>

        <Card style={{ gap: SPACING.md }}>
          <SectionLabel text="This device" />
          <Text style={{ color: theme.fgMuted, fontSize: 13 }}>
            Connected to Kaksha with the setup code. Disconnecting removes it and asks for
            the code again.
          </Text>
          <Button
            label="Disconnect this device"
            variant="danger"
            icon="log-out-outline"
            onPress={() => {
              setDisconnecting(true);
            }}
          />
        </Card>

        <UpdateCard state={appUpdate} />
      </View>

      <ConfirmDialog
        visible={disconnecting}
        title="Disconnect this device?"
        message={
          sync.pending > 0
            ? `${String(sync.pending)} changes have not reached the server yet and will be lost. You will need the setup code to connect again.`
            : "You will need the setup code to connect again."
        }
        confirmLabel="Disconnect"
        destructive
        onConfirm={() => {
          setDisconnecting(false);
          disconnectDevice();
        }}
        onCancel={() => {
          setDisconnecting(false);
        }}
      />
    </View>
  );
}
