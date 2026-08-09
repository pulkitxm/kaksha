import type { SurfaceTheme } from "@kaksha/core";

export function editorCss(theme: SurfaceTheme): string {
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
