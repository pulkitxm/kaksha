import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ConfirmDialog } from "../../src/components/ConfirmDialog";
import { NoteEditor } from "../../src/components/NoteEditor";
import { useToast } from "../../src/components/Toast";
import { Banner, IconButton, PressableScale } from "../../src/components/ui";
import { useNotes } from "../../src/lib/notes";
import { SPACING, useTheme } from "../../src/lib/theme";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function toPreview(html: string): string {
  return html
    .replace(/<(li|p|div|h[1-6]|br)[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (match) => ENTITIES[match.toLowerCase()] ?? " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export default function NoteScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const notes = useNotes();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { update } = notes;
  const note = notes.notes.find((item) => item.id === id);
  const [title, setTitle] = useState(note?.title ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const saved = useRef(note?.html ?? "");

  const handleChangeHtml = useCallback(
    (html: string) => {
      if (!id || html === saved.current) return;
      saved.current = html;
      update(id, { html, preview: toPreview(html) });
    },
    [id, update],
  );

  if (!note) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.bg, padding: SPACING.lg }}
        edges={["top", "left", "right"]}
      >
        <Banner text="This note is no longer here" tone="error" />
        <View style={{ marginTop: SPACING.lg, alignItems: "flex-start" }}>
          <IconButton
            icon="arrow-back"
            label="Back"
            onPress={() => {
              router.back();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top", "left", "right"]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.sm,
          borderBottomColor: theme.line,
          borderBottomWidth: StyleSheet.hairlineWidth,
        }}
      >
        <IconButton
          icon="arrow-back"
          label="Back to notes"
          onPress={() => {
            router.back();
          }}
        />

        <TextInput
          value={title}
          onChangeText={(next) => {
            setTitle(next);
            notes.update(note.id, { title: next.trim().length > 0 ? next : "Untitled" });
          }}
          placeholder="Note title"
          placeholderTextColor={theme.fgFaint}
          maxLength={120}
          style={{
            flex: 1,
            color: theme.fg,
            fontSize: 17,
            fontWeight: "700",
            minHeight: 44,
            paddingHorizontal: SPACING.sm,
          }}
        />

        {notes.dirty.includes(note.id) ? (
          <Text style={{ color: theme.fgFaint, fontSize: 11 }}>Saving</Text>
        ) : null}

        <PressableScale
          label={note.pinned ? "Unpin note" : "Pin note"}
          selected={note.pinned}
          pressedScale={0.88}
          onPress={() => {
            notes.update(note.id, { pinned: !note.pinned });
          }}
          style={{ padding: SPACING.sm }}
        >
          <Text
            style={{ color: note.pinned ? theme.accent : theme.fgMuted, fontSize: 13 }}
          >
            {note.pinned ? "Pinned" : "Pin"}
          </Text>
        </PressableScale>

        <IconButton
          icon="trash-outline"
          label="Delete note"
          tone="danger"
          size={17}
          onPress={() => {
            setConfirmingDelete(true);
          }}
        />
      </View>

      <NoteEditor initialHtml={note.html} onChangeHtml={handleChangeHtml} />

      <ConfirmDialog
        visible={confirmingDelete}
        title={`Delete "${note.title}"?`}
        message="The note and everything written in it are removed."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          notes.remove(note.id);
          setConfirmingDelete(false);
          toast("Note deleted", "success");
          router.back();
        }}
        onCancel={() => {
          setConfirmingDelete(false);
        }}
      />
    </SafeAreaView>
  );
}
