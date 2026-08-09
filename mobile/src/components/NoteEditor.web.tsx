import { useEffect, useRef } from "react";

import { editorCss } from "../lib/noteStyles";
import { useTheme } from "../lib/theme";
import { type NoteEditorProps } from "./NoteEditor";

const SAVE_DELAY_MS = 600;

const COMMANDS: { command: string; label: string; glyph: string }[] = [
  { command: "bold", label: "Bold", glyph: "B" },
  { command: "italic", label: "Italic", glyph: "I" },
  { command: "underline", label: "Underline", glyph: "U" },
  { command: "insertUnorderedList", label: "Bulleted list", glyph: "•" },
  { command: "insertOrderedList", label: "Numbered list", glyph: "1." },
];

export type { NoteEditorProps };

export function NoteEditor({ initialHtml, onChangeHtml }: NoteEditorProps) {
  const theme = useTheme();
  const surface = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const node = surface.current;
    if (node && node.innerHTML.length === 0) {
      node.innerHTML = initialHtml.length > 0 ? initialHtml : "<p></p>";
    }
  }, [initialHtml]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const scheduleSave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChangeHtml(surface.current?.innerHTML ?? "");
    }, SAVE_DELAY_MS);
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.bg,
      }}
    >
      <style>{editorCss(theme)}</style>
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "6px 16px",
          borderBottom: `1px solid ${theme.line}`,
          backgroundColor: theme.bgSubtle,
        }}
      >
        {COMMANDS.map((item) => (
          <button
            key={item.command}
            type="button"
            aria-label={item.label}
            title={item.label}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              document.execCommand(item.command);
              surface.current?.focus();
              scheduleSave();
            }}
            style={{
              minWidth: 32,
              height: 30,
              border: "none",
              borderRadius: 8,
              background: "transparent",
              color: theme.fgMuted,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {item.glyph}
          </button>
        ))}
      </div>
      <div
        ref={surface}
        className="ProseMirror"
        contentEditable
        suppressContentEditableWarning
        onInput={scheduleSave}
        onBlur={scheduleSave}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          outline: "none",
          padding: "12px 20px",
        }}
      />
    </div>
  );
}
