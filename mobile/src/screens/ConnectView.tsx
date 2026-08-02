import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { MIN_ACCESS_CODE_LENGTH } from "@kaksha/core";

import { Banner, Button, Card } from "../components/ui";
import { checkAccessCode } from "../lib/api";
import { RADIUS, SPACING, useTheme } from "../lib/theme";

export function ConnectView({
  reason,
  onConnected,
}: {
  reason: "new" | "rejected";
  onConnected: (code: string) => Promise<void>;
}) {
  const theme = useTheme();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const trimmed = code.trim();

  async function connect() {
    setBusy(true);
    setProblem(null);
    try {
      if (await checkAccessCode(trimmed)) {
        await onConnected(trimmed);
        return;
      }
      setProblem("That code was not accepted. Check it and try again.");
    } catch {
      setProblem("Could not reach Kaksha. Check the internet connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top", "left", "right", "bottom"]}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: SPACING.lg,
        }}
      >
        <Animated.View
          entering={FadeInDown.duration(260)}
          style={{ width: "100%", maxWidth: 420 }}
        >
          <Card style={{ gap: SPACING.lg }}>
            <View>
              <Text style={{ color: theme.fg, fontSize: 24, fontWeight: "700" }}>
                Kaksha
              </Text>
              <Text style={{ color: theme.fgMuted, fontSize: 14, marginTop: SPACING.xs }}>
                {reason === "rejected"
                  ? "This device is no longer connected. Enter the setup code again."
                  : "Enter the setup code to connect this device."}
              </Text>
            </View>

            {problem ? <Banner text={problem} tone="error" /> : null}

            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Setup code"
              placeholderTextColor={theme.fgFaint}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              maxLength={200}
              onSubmitEditing={() => {
                if (trimmed.length >= MIN_ACCESS_CODE_LENGTH && !busy) void connect();
              }}
              style={{
                backgroundColor: theme.panel,
                borderColor: theme.lineStrong,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: RADIUS.md,
                color: theme.fg,
                paddingHorizontal: SPACING.md,
                minHeight: 48,
                fontSize: 16,
              }}
            />

            <Button
              label={busy ? "Connecting" : "Connect"}
              variant="primary"
              busy={busy}
              disabled={trimmed.length < MIN_ACCESS_CODE_LENGTH}
              onPress={() => {
                void connect();
              }}
            />

            <Text style={{ color: theme.fgFaint, fontSize: 12 }}>
              You only do this once on this device.
            </Text>
          </Card>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
