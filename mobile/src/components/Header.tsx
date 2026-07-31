import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import type { ResolvedDataset } from "@kaksha/core";

import { useStore } from "../lib/store";
import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { SelectSheet } from "./Select";
import { useToast } from "./Toast";
import { IconButton, PressableScale } from "./ui";

function clockTime(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function ReloadButton() {
  const theme = useTheme();
  const toast = useToast();
  const { sync, reload } = useStore();
  const turns = useSharedValue(0);

  useEffect(() => {
    if (sync.syncing) {
      turns.set(0);
      turns.set(withRepeat(withTiming(1, { duration: 850, easing: Easing.linear }), -1));
    } else {
      cancelAnimation(turns);
      turns.set(0);
    }
  }, [sync.syncing, turns]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turns.get() * 360}deg` }],
  }));

  return (
    <View>
      <PressableScale
        label="Reload data"
        disabled={sync.syncing}
        pressedScale={0.88}
        onPress={() => {
          void reload().then((result) => {
            if (result === "synced") toast("Timetable is up to date", "success");
            else toast("You are offline, showing the saved copy", "error");
          });
        }}
        style={{
          width: 38,
          height: 38,
          borderRadius: RADIUS.pill,
          backgroundColor: theme.bgSubtle,
          borderColor: theme.line,
          borderWidth: StyleSheet.hairlineWidth,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View style={spinStyle}>
          <Ionicons name="refresh" size={19} color={theme.fgMuted} />
        </Animated.View>
      </PressableScale>
      {sync.offline || sync.pending > 0 ? (
        <View
          style={{
            position: "absolute",
            top: -1,
            right: -1,
            width: 10,
            height: 10,
            borderRadius: RADIUS.pill,
            backgroundColor: sync.pending > 0 ? "#f59e0b" : theme.danger,
            borderColor: theme.bg,
            borderWidth: 1.5,
          }}
        />
      ) : null}
    </View>
  );
}

export function Header({
  dataset,
  activeFilterCount,
  onOpenFilters,
  onOpenSections,
}: {
  dataset: ResolvedDataset;
  activeFilterCount: number;
  onOpenFilters: () => void;
  onOpenSections: () => void;
}) {
  const theme = useTheme();
  const { classId, setClassId, sync } = useStore();
  const [classPickerOpen, setClassPickerOpen] = useState(false);

  const statusLine = sync.syncing
    ? "Syncing"
    : sync.pending > 0
      ? `Offline · ${String(sync.pending)} queued`
      : sync.offline
        ? "Offline · cached copy"
        : sync.lastSyncedAt
          ? `Synced ${clockTime(sync.lastSyncedAt)}`
          : `${String(dataset.sections.length)} sections`;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomColor: theme.line,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: SPACING.sm,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.fg, fontSize: 18, fontWeight: "700" }}>Kaksha</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          {sync.offline && !sync.syncing ? (
            <Ionicons name="cloud-offline-outline" size={11} color={theme.fgFaint} />
          ) : null}
          <Text style={{ color: theme.fgFaint, fontSize: 12 }}>{statusLine}</Text>
        </View>
      </View>

      <PressableScale
        label="Switch class"
        onPress={() => {
          setClassPickerOpen(true);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: theme.bgSubtle,
          borderColor: theme.line,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: RADIUS.pill,
          paddingLeft: SPACING.md,
          paddingRight: SPACING.sm,
          height: 38,
        }}
      >
        <Text style={{ color: theme.fg, fontSize: 13, fontWeight: "700" }}>
          {dataset.currentClass.shortName}
        </Text>
        <Ionicons name="chevron-down" size={13} color={theme.fgFaint} />
      </PressableScale>

      <View>
        <IconButton icon="options-outline" label="Filters" onPress={onOpenFilters} />
        {activeFilterCount > 0 ? (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 17,
              height: 17,
              borderRadius: RADIUS.pill,
              backgroundColor: theme.accent,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 4,
              borderColor: theme.bg,
              borderWidth: 1.5,
            }}
          >
            <Text style={{ color: theme.accentText, fontSize: 10, fontWeight: "700" }}>
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </View>

      <IconButton icon="albums-outline" label="Sections" onPress={onOpenSections} />

      <ReloadButton />

      <SelectSheet
        visible={classPickerOpen}
        title="Class"
        subtitle="Pick which class to load"
        options={dataset.classes.map((item) => ({
          id: item.id,
          label: item.name,
          sublabel: `${String(item.entryCount)} slots`,
          badge: item.active ? undefined : "inactive",
        }))}
        selected={[classId]}
        onChange={(ids) => {
          const next = ids[0];
          if (next && next !== classId) setClassId(next);
        }}
        onClose={() => {
          setClassPickerOpen(false);
        }}
      />
    </View>
  );
}
