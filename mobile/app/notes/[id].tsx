import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CoreBridge,
  PlaceholderBridge,
  RichText,
  TenTapStartKit,
  Toolbar,
  useEditorBridge,
  useEditorContent,
} from "@10play/tentap-editor";
import type { SurfaceTheme } from "@kaksha/core";

import { ConfirmDialog } from "../../src/components/ConfirmDialog";
import { useToast } from "../../src/components/Toast";
import { Banner, IconButton, PressableScale } from "../../src/components/ui";
import { useNotes } from "../../src/lib/notes";
import { SPACING, useTheme } from "../../src/lib/theme";

function editorCss(theme: SurfaceTheme): string {
  return `
    .ProseMirror {
      background-color: ${theme.bg};
      color: ${theme.fg};
      font-size: 16px;
      line-height: 1.6;
      padding: 4px 2px 120px 2px;
      caret-color: ${theme.accent};
    }
    .ProseMirror h1 { font-size: 26px; font-weight: 700; margin: 18px 0 8px; }
    .ProseMirror h2 { font-size: 21px; font-weight: 700; margin: 16px 0 6px; }
    .ProseMirror h3 { font-size: 18px; font-weight: 700; margin: 14px 0 6px; }
    .ProseMirror p { margin: 6px 0; }
    .ProseMirror ul, .ProseMirror ol { padding-left: 22px; }
    .ProseMirror li { margin: 3px 0; }
    .ProseMirror blockquote {
      border-left: 3px solid ${theme.lineStrong};
      padding-left: 12px;
      color: ${theme.fgMuted};
      margin: 8px 0;
    }
    .ProseMirror code {
      background-color: ${theme.bgSubtle};
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 14px;
    }
    .ProseMirror a { color: ${theme.accent}; }
    .ProseMirror hr { border: none; border-top: 1px solid ${theme.line}; margin: 16px 0; }
    .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
    .ProseMirror ul[data-type="taskList"] li { display: flex; gap: 8px; }
    .ProseMirror .is-editor-empty:first-child::before {
      color: ${theme.fgFaint};
      content: attr(data-placeholder);
      float: left;
      height: 0;
      pointer-events: none;
    }
  `;
}

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

  const bridgeExtensions = useMemo(
    () => [
      ...TenTapStartKit,
      CoreBridge.configureCSS(editorCss(theme)),
      PlaceholderBridge.configureExtension({ placeholder: "Start writing" }),
    ],
    [theme],
  );

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: note?.html && note.html.length > 0 ? note.html : "<p></p>",
    bridgeExtensions,
  });

  const html = useEditorContent(editor, { type: "html", debounceInterval: 600 });

  useEffect(() => {
    if (!id || html === undefined || html === saved.current) return;
    saved.current = html;
    update(id, { html, preview: toPreview(html) });
  }, [html, id, update]);

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

      <RichText editor={editor} style={{ flex: 1, backgroundColor: theme.bg }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ position: "absolute", width: "100%", bottom: 0 }}
      >
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>

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
