import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";

import { ConfirmDialog } from "../src/components/ConfirmDialog";
import { DetailScreen } from "../src/components/DetailScreen";
import { useToast } from "../src/components/Toast";
import { Button, Card, CountPill, EmptyState, type IconName } from "../src/components/ui";
import { describeOp } from "../src/lib/describeOp";
import { useNotes } from "../src/lib/notes";
import { useStore } from "../src/lib/store";
import { RADIUS, SPACING, useTheme } from "../src/lib/theme";

function whenLabel(iso: string | null): string {
  if (!iso) return "not yet";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${String(minutes)} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)} hours ago`;
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}

function StatusRow({
  icon,
  tone,
  title,
  hint,
}: {
  icon: IconName;
  tone: string;
  title: string;
  hint: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: RADIUS.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: `${tone}1f`,
          borderColor: `${tone}55`,
          borderWidth: StyleSheet.hairlineWidth,
        }}
      >
        <Ionicons name={icon} size={19} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.fg, fontSize: 15, fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 1 }}>{hint}</Text>
      </View>
    </View>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: theme.fgMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: theme.fg, fontSize: 13, fontWeight: "700" }}>
        {String(value)}
      </Text>
    </View>
  );
}

export default function SyncScreen() {
  const theme = useTheme();
  const toast = useToast();
  const store = useStore();
  const notes = useNotes();
  const [discarding, setDiscarding] = useState(false);

  const { sync, db } = store;
  const waiting = sync.queue.length + notes.dirty.length;

  const state = sync.syncing
    ? {
        icon: "sync-outline" as IconName,
        tone: theme.accent,
        title: "Syncing now",
        hint: "Sending your changes and fetching the latest timetable",
      }
    : waiting > 0
      ? {
          icon: "cloud-upload-outline" as IconName,
          tone: "#f59e0b",
          title: `${String(waiting)} changes waiting`,
          hint: "They are saved on this device and go up as soon as there is a connection",
        }
      : sync.offline
        ? {
            icon: "cloud-offline-outline" as IconName,
            tone: theme.danger,
            title: "Cannot reach the server",
            hint: "You are looking at the copy saved on this device",
          }
        : {
            icon: "checkmark-circle-outline" as IconName,
            tone: "#10b981",
            title: "Everything is synced",
            hint: "This device matches the school timetable",
          };

  return (
    <DetailScreen title="Sync">
      <Card style={{ gap: SPACING.lg }}>
        <StatusRow {...state} />
        <Button
          label={sync.syncing ? "Syncing" : "Sync now"}
          variant="primary"
          icon="refresh"
          busy={sync.syncing}
          onPress={() => {
            void store.syncNow().then((result) => {
              toast(
                result === "synced"
                  ? "Everything is up to date"
                  : "Still offline, your changes are kept here",
                result === "synced" ? "success" : "error",
              );
            });
          }}
        />
        <Text style={{ color: theme.fgFaint, fontSize: 12 }}>
          Last checked {whenLabel(sync.lastSyncedAt)}
        </Text>
      </Card>

      <Card style={{ gap: SPACING.md }}>
        <Text style={{ color: theme.fgFaint, fontSize: 11, letterSpacing: 0.8 }}>
          ON THIS DEVICE
        </Text>
        <CountRow label="Classes" value={db?.classes.length ?? 0} />
        <CountRow label="Sections" value={db?.sections.length ?? 0} />
        <CountRow label="Lectures" value={db?.entries.length ?? 0} />
        <CountRow label="Teachers" value={db?.teachers.length ?? 0} />
        <CountRow label="Subjects" value={db?.subjects.length ?? 0} />
        <CountRow label="Notes" value={db?.notes.length ?? 0} />
      </Card>

      <View style={{ gap: SPACING.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <Text style={{ color: theme.fgFaint, fontSize: 11, letterSpacing: 0.8 }}>
            WAITING TO BE SENT
          </Text>
          {waiting > 0 ? <CountPill label={String(waiting)} /> : null}
        </View>

        {waiting === 0 ? (
          <EmptyState
            title="Nothing is waiting"
            hint="Every change you have made is on the server"
          />
        ) : null}

        {sync.queue.map((op, index) => (
          <Animated.View
            key={`${op.kind}-${String(index)}`}
            entering={FadeInDown.delay(Math.min(index * 24, 240)).duration(200)}
          >
            <Card
              style={{
                padding: SPACING.md,
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING.md,
              }}
            >
              <Ionicons name="time-outline" size={17} color={theme.fgMuted} />
              <Text style={{ color: theme.fg, fontSize: 14, flex: 1 }}>
                {describeOp(op, db)}
              </Text>
            </Card>
          </Animated.View>
        ))}

        {notes.dirty.length > 0 ? (
          <Card
            style={{
              padding: SPACING.md,
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.md,
            }}
          >
            <Ionicons name="document-text-outline" size={17} color={theme.fgMuted} />
            <Text style={{ color: theme.fg, fontSize: 14, flex: 1 }}>
              {notes.dirty.length === 1
                ? "One note is still saving"
                : `${String(notes.dirty.length)} notes are still saving`}
            </Text>
          </Card>
        ) : null}
      </View>

      {sync.queue.length > 0 ? (
        <Button
          label="Discard waiting changes"
          variant="danger"
          icon="trash-outline"
          onPress={() => {
            setDiscarding(true);
          }}
        />
      ) : null}

      <ConfirmDialog
        visible={discarding}
        title="Discard waiting changes?"
        message="The changes listed above are thrown away and this device goes back to whatever the server has. This cannot be undone."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          store.discardPending();
          setDiscarding(false);
          toast("Waiting changes discarded", "success");
        }}
        onCancel={() => {
          setDiscarding(false);
        }}
      />
    </DetailScreen>
  );
}
