import { useMemo, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { DetailScreen } from "../src/components/DetailScreen";
import { useToast } from "../src/components/Toast";
import { Button, Card, Chip, EmptyState, PressableScale } from "../src/components/ui";
import {
  clearLog,
  formatLog,
  useLog,
  type LogEntry,
  type LogLevel,
} from "../src/lib/log";
import { RADIUS, SPACING, useTheme } from "../src/lib/theme";

const FILTERS: { key: LogLevel | "all"; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "error", label: "Errors" },
  { key: "warn", label: "Warnings" },
  { key: "info", label: "Activity" },
];

function clockTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function Row({ entry }: { entry: LogEntry }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const tone =
    entry.level === "error"
      ? theme.danger
      : entry.level === "warn"
        ? "#f59e0b"
        : theme.fgMuted;

  return (
    <PressableScale
      label={entry.message}
      pressedScale={0.995}
      onPress={() => {
        setOpen((current) => !current);
      }}
    >
      <Card style={{ padding: SPACING.md, gap: SPACING.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: RADIUS.pill,
              backgroundColor: tone,
            }}
          />
          <Text style={{ color: theme.fgFaint, fontSize: 11 }}>
            {clockTime(entry.at)}
          </Text>
          <Text style={{ color: theme.fgFaint, fontSize: 11 }}>{entry.scope}</Text>
          <View style={{ flex: 1 }} />
          {entry.detail ? (
            <Ionicons
              name={open ? "chevron-up" : "chevron-down"}
              size={13}
              color={theme.fgFaint}
            />
          ) : null}
        </View>
        <Text style={{ color: theme.fg, fontSize: 13 }}>{entry.message}</Text>
        {open && entry.detail ? (
          <Text
            style={{
              color: theme.fgMuted,
              fontSize: 12,
              fontFamily: "monospace",
              backgroundColor: theme.bgSubtle,
              borderColor: theme.line,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: RADIUS.sm,
              padding: SPACING.sm,
            }}
          >
            {entry.detail}
          </Text>
        ) : null}
      </Card>
    </PressableScale>
  );
}

export default function LogsScreen() {
  const theme = useTheme();
  const toast = useToast();
  const entries = useLog();
  const [level, setLevel] = useState<LogLevel | "all">("all");

  const visible = useMemo(
    () => (level === "all" ? entries : entries.filter((entry) => entry.level === level)),
    [entries, level],
  );

  const errorCount = entries.filter((entry) => entry.level === "error").length;

  return (
    <DetailScreen title="Logs">
      <Text style={{ color: theme.fgMuted, fontSize: 13 }}>
        {entries.length === 0
          ? "Nothing has been recorded yet."
          : `The last ${String(entries.length)} things the app did, newest first. ${
              errorCount > 0
                ? `${String(errorCount)} of them went wrong.`
                : "Nothing has gone wrong."
            }`}
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {FILTERS.map((filter) => (
          <Chip
            key={filter.key}
            label={filter.label}
            active={level === filter.key}
            onPress={() => {
              setLevel(filter.key);
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Share logs"
            icon="share-outline"
            disabled={entries.length === 0}
            onPress={() => {
              void Share.share({ message: formatLog(entries) });
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Clear"
            icon="trash-outline"
            disabled={entries.length === 0}
            onPress={() => {
              clearLog();
              toast("Logs cleared", "success");
            }}
          />
        </View>
      </View>

      <View style={{ gap: SPACING.sm }}>
        {visible.length === 0 ? (
          <EmptyState
            title="Nothing here"
            hint={
              entries.length === 0
                ? "Logs appear as you use the app"
                : "Nothing matches this filter"
            }
          />
        ) : null}
        {visible.map((entry) => (
          <Row key={entry.id} entry={entry} />
        ))}
      </View>
    </DetailScreen>
  );
}
