import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Note } from "@kaksha/core";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { SearchBar } from "../components/SearchBar";
import { useToast } from "../components/Toast";
import {
  Button,
  Card,
  CountPill,
  EmptyState,
  IconButton,
  PressableScale,
  ScreenHeading,
} from "../components/ui";
import { useNotes } from "../lib/notes";
import { RADIUS, SPACING, useTheme } from "../lib/theme";

function whenLabel(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${String(minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${String(days)}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

export function NotesView() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const notes = useNotes();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Note | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notes.notes.filter(
      (note) =>
        !needle ||
        note.title.toLowerCase().includes(needle) ||
        note.preview.toLowerCase().includes(needle),
    );
  }, [notes.notes, query]);

  async function create() {
    setCreating(true);
    try {
      const note = await notes.create("Untitled note");
      router.push(`/notes/${note.id}`);
    } catch (cause) {
      toast(
        cause instanceof Error ? cause.message : "Could not create the note",
        "error",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <View>
      <ScreenHeading
        title="Notes"
        hint={
          notes.offline
            ? "Saved on this device, syncing when you are back online"
            : `${String(notes.notes.length)} notes for this class`
        }
        action={
          <Button
            label="New note"
            variant="primary"
            icon="add"
            busy={creating}
            onPress={() => {
              void create();
            }}
          />
        }
      />

      <SearchBar value={query} placeholder="Search notes" onChange={setQuery} />

      {notes.status === "loading" ? (
        <View style={{ paddingVertical: SPACING.xl * 2, alignItems: "center" }}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : null}

      <View style={{ gap: SPACING.sm, marginTop: SPACING.md }}>
        {notes.status !== "loading" && visible.length === 0 ? (
          <EmptyState
            title={query ? "Nothing matches" : "No notes yet"}
            hint={
              query
                ? "Try a different word"
                : "Keep reminders, duty rosters or anything else here"
            }
          />
        ) : null}

        {visible.map((note, index) => (
          <Animated.View
            key={note.id}
            entering={FadeInDown.delay(Math.min(index * 24, 240)).duration(200)}
          >
            <PressableScale
              label={`Open ${note.title}`}
              pressedScale={0.99}
              onPress={() => {
                router.push(`/notes/${note.id}`);
              }}
            >
              <Card
                style={{
                  padding: SPACING.md,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACING.md,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: RADIUS.md,
                    backgroundColor: theme.bgSubtle,
                    borderColor: theme.line,
                    borderWidth: StyleSheet.hairlineWidth,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={note.pinned ? "bookmark" : "document-text-outline"}
                    size={17}
                    color={note.pinned ? theme.accent : theme.fgMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING.sm,
                    }}
                  >
                    <Text
                      style={{ color: theme.fg, fontWeight: "700", fontSize: 15 }}
                      numberOfLines={1}
                    >
                      {note.title}
                    </Text>
                    {notes.dirty.includes(note.id) ? (
                      <CountPill label="unsynced" />
                    ) : null}
                  </View>
                  <Text
                    style={{ color: theme.fgMuted, fontSize: 12, marginTop: 2 }}
                    numberOfLines={2}
                  >
                    {note.preview.length > 0 ? note.preview : "Empty note"}
                  </Text>
                  <Text style={{ color: theme.fgFaint, fontSize: 11, marginTop: 4 }}>
                    Edited {whenLabel(note.updatedAt)}
                  </Text>
                </View>

                <IconButton
                  icon="trash-outline"
                  label={`Delete ${note.title}`}
                  size={16}
                  tone="danger"
                  onPress={() => {
                    setRemoving(note);
                  }}
                />
              </Card>
            </PressableScale>
          </Animated.View>
        ))}
      </View>

      <ConfirmDialog
        visible={removing !== null}
        title={`Delete "${removing?.title ?? ""}"?`}
        message="The note and everything written in it are removed."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (removing) notes.remove(removing.id);
          setRemoving(null);
          toast("Note deleted", "success");
        }}
        onCancel={() => {
          setRemoving(null);
        }}
      />
    </View>
  );
}
