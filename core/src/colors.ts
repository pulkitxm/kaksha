export const COLOR_TOKENS = [
  "blue",
  "orange",
  "violet",
  "emerald",
  "amber",
  "rose",
  "teal",
  "cyan",
  "lime",
  "fuchsia",
  "sky",
  "slate",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

const TOKEN_SET = new Set<string>(COLOR_TOKENS);

export function isColorToken(value: unknown): value is ColorToken {
  return typeof value === "string" && TOKEN_SET.has(value);
}

export function colorForKey(key: string): ColorToken {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return COLOR_TOKENS[hash % COLOR_TOKENS.length] ?? "slate";
}

export type Swatch = {
  base: string;
  deep: string;
  light: string;
};

export const SWATCHES: Record<ColorToken, Swatch> = {
  blue: { base: "#3b82f6", deep: "#1d4ed8", light: "#93c5fd" },
  orange: { base: "#f97316", deep: "#c2410c", light: "#fdba74" },
  violet: { base: "#8b5cf6", deep: "#6d28d9", light: "#c4b5fd" },
  emerald: { base: "#10b981", deep: "#047857", light: "#6ee7b7" },
  amber: { base: "#f59e0b", deep: "#b45309", light: "#fcd34d" },
  rose: { base: "#f43f5e", deep: "#be123c", light: "#fda4af" },
  teal: { base: "#14b8a6", deep: "#0f766e", light: "#5eead4" },
  cyan: { base: "#06b6d4", deep: "#0e7490", light: "#67e8f9" },
  lime: { base: "#84cc16", deep: "#4d7c0f", light: "#bef264" },
  fuchsia: { base: "#d946ef", deep: "#a21caf", light: "#f0abfc" },
  sky: { base: "#0ea5e9", deep: "#0369a1", light: "#7dd3fc" },
  slate: { base: "#64748b", deep: "#475569", light: "#cbd5e1" },
};

export function swatch(color: string): Swatch {
  return isColorToken(color) ? SWATCHES[color] : SWATCHES.slate;
}

export const BRAND = {
  green: "#1b4a3a",
  greenLight: "#4c9b7d",
  gold: "#d2952f",
  cream: "#faf3e3",
} as const;

export type SurfaceTheme = {
  isDark: boolean;
  bg: string;
  bgSubtle: string;
  panel: string;
  panelHover: string;
  line: string;
  lineStrong: string;
  fg: string;
  fgMuted: string;
  fgFaint: string;
  accent: string;
  accentText: string;
  danger: string;
  chipBgAlpha: string;
  chipBorderAlpha: string;
};

export const THEMES: Record<"light" | "dark", SurfaceTheme> = {
  light: {
    isDark: false,
    bg: "#ffffff",
    bgSubtle: "#f6f6f4",
    panel: "#ffffff",
    panelHover: "#f0f0ee",
    line: "#e5e5e5",
    lineStrong: "#cdcdcd",
    fg: "#0a0a0a",
    fgMuted: "#5f5f5f",
    fgFaint: "#8f8f8f",
    accent: BRAND.green,
    accentText: "#ffffff",
    danger: "#be123c",
    chipBgAlpha: "1f",
    chipBorderAlpha: "4d",
  },
  dark: {
    isDark: true,
    bg: "#0a0a0a",
    bgSubtle: "#121212",
    panel: "#161616",
    panelHover: "#1f1f1f",
    line: "#282828",
    lineStrong: "#3d3d3d",
    fg: "#ededed",
    fgMuted: "#a3a3a3",
    fgFaint: "#7a7a7a",
    accent: BRAND.greenLight,
    accentText: "#04140e",
    danger: "#fb7185",
    chipBgAlpha: "26",
    chipBorderAlpha: "5c",
  },
};

export type SubjectPaint = {
  accent: string;
  background: string;
  border: string;
  badgeText: string;
};

export function subjectPaint(color: string, theme: SurfaceTheme): SubjectPaint {
  const tone = swatch(color);
  const accent = theme.isDark ? tone.base : tone.deep;

  return {
    accent,
    background: `${tone.base}${theme.chipBgAlpha}`,
    border: `${tone.base}${theme.chipBorderAlpha}`,
    badgeText: theme.isDark ? "#0a0a0a" : "#ffffff",
  };
}
