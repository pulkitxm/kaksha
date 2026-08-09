import { useEffect, useMemo } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import {
  CoreBridge,
  darkEditorTheme,
  defaultEditorTheme,
  PlaceholderBridge,
  RichText,
  TenTapStartKit,
  Toolbar,
  useEditorBridge,
  useEditorContent,
} from "@10play/tentap-editor";

import { editorCss } from "../lib/noteStyles";
import { useTheme } from "../lib/theme";

export type NoteEditorProps = {
  initialHtml: string;
  onChangeHtml: (html: string) => void;
};

export function NoteEditor({ initialHtml, onChangeHtml }: NoteEditorProps) {
  const theme = useTheme();

  const bridgeExtensions = useMemo(
    () => [
      ...TenTapStartKit,
      CoreBridge.configureCSS(editorCss(theme)),
      PlaceholderBridge.configureExtension({ placeholder: "Start writing" }),
    ],
    [theme],
  );

  const editorTheme = useMemo(() => {
    const base = theme.isDark ? darkEditorTheme : defaultEditorTheme;
    return {
      ...base,
      toolbar: {
        ...base.toolbar,
        toolbarBody: [
          base.toolbar.toolbarBody,
          {
            backgroundColor: theme.bgSubtle,
            borderTopColor: theme.line,
            borderBottomColor: theme.line,
          },
        ],
      },
      webview: [base.webview, { backgroundColor: theme.bg }],
      webviewContainer: [base.webviewContainer, { backgroundColor: theme.bg }],
    };
  }, [theme]);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: initialHtml.length > 0 ? initialHtml : "<p></p>",
    bridgeExtensions,
    theme: editorTheme,
  });

  const html = useEditorContent(editor, { type: "html", debounceInterval: 600 });

  useEffect(() => {
    if (html !== undefined) onChangeHtml(html);
  }, [html, onChangeHtml]);

  return (
    <>
      <RichText editor={editor} style={{ flex: 1, backgroundColor: theme.bg }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ position: "absolute", width: "100%", bottom: 0 }}
      >
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </>
  );
}
