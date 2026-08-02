import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useToast } from "../components/Toast";
import { Banner, Button, Card, TextField } from "../components/ui";
import { useStore } from "../lib/store";
import { SPACING, useTheme } from "../lib/theme";

const DEFAULT_PERIODS = 8;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function FirstClassView() {
  const theme = useTheme();
  const toast = useToast();
  const store = useStore();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const label = shortName.trim() || trimmed;
  const id = slugify(label);

  async function create() {
    if (busy || trimmed.length === 0 || id.length === 0) return;
    setBusy(true);
    try {
      await store.mutate({
        kind: "createClass",
        input: {
          id,
          name: trimmed,
          shortName: label,
          active: true,
          periods: Array.from({ length: DEFAULT_PERIODS }, (_, index) => ({
            id: index + 1,
            name: String(index + 1),
            label: String(index + 1),
          })),
          subjectIds: [],
        },
      });
      store.setClassId(id);
      toast(`${trimmed} added`, "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not add the class", "error");
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
          style={{ width: "100%", maxWidth: 460 }}
        >
          <Card style={{ gap: SPACING.lg }}>
            <View>
              <Text style={{ color: theme.fg, fontSize: 24, fontWeight: "700" }}>
                Start with a class
              </Text>
              <Text style={{ color: theme.fgMuted, fontSize: 14, marginTop: SPACING.xs }}>
                There is nothing here yet. Add the first class and the rest of the app
                opens up, where you can add its sections, subjects and teachers.
              </Text>
            </View>

            {store.sync.offline ? (
              <Banner
                text="You are offline. The class is saved on this device and goes up when the connection is back."
                tone="info"
              />
            ) : null}

            <TextField
              label="Name"
              value={name}
              placeholder="Class VI"
              maxLength={60}
              autoCapitalize="words"
              onChangeText={setName}
            />
            <TextField
              label="Short name"
              value={shortName}
              placeholder="VI"
              maxLength={20}
              autoCapitalize="characters"
              onChangeText={setShortName}
            />

            <Button
              label={busy ? "Adding" : "Add class"}
              variant="primary"
              icon="add"
              busy={busy}
              disabled={trimmed.length === 0 || id.length === 0}
              onPress={() => {
                void create();
              }}
            />

            <Text style={{ color: theme.fgFaint, fontSize: 12 }}>
              It starts with {String(DEFAULT_PERIODS)} periods a day. Change them later in
              the Classes tab.
            </Text>
          </Card>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
