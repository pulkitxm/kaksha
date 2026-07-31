import type { ColorToken } from "./types";

export const COLOR_TOKENS: ColorToken[] = [
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
];

const TOKEN_SET = new Set<string>(COLOR_TOKENS);

export function isColorToken(value: unknown): value is ColorToken {
  return typeof value === "string" && TOKEN_SET.has(value);
}

export function colorForKey(key: string): ColorToken {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return COLOR_TOKENS[hash % COLOR_TOKENS.length];
}

type Swatch = {
  text: string;
  bg: string;
  border: string;
  dot: string;
  bar: string;
};

export const SWATCHES: Record<ColorToken, Swatch> = {
  blue: {
    text: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-500/10 dark:bg-blue-400/10",
    border: "border-blue-500/25 dark:border-blue-400/25",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
  },
  orange: {
    text: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-500/10 dark:bg-orange-400/10",
    border: "border-orange-500/25 dark:border-orange-400/25",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
  },
  violet: {
    text: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-500/10 dark:bg-violet-400/10",
    border: "border-violet-500/25 dark:border-violet-400/25",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
  },
  emerald: {
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
    border: "border-emerald-500/25 dark:border-emerald-400/25",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  amber: {
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 dark:bg-amber-400/10",
    border: "border-amber-500/25 dark:border-amber-400/25",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  rose: {
    text: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/10 dark:bg-rose-400/10",
    border: "border-rose-500/25 dark:border-rose-400/25",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
  teal: {
    text: "text-teal-700 dark:text-teal-300",
    bg: "bg-teal-500/10 dark:bg-teal-400/10",
    border: "border-teal-500/25 dark:border-teal-400/25",
    dot: "bg-teal-500",
    bar: "bg-teal-500",
  },
  cyan: {
    text: "text-cyan-700 dark:text-cyan-300",
    bg: "bg-cyan-500/10 dark:bg-cyan-400/10",
    border: "border-cyan-500/25 dark:border-cyan-400/25",
    dot: "bg-cyan-500",
    bar: "bg-cyan-500",
  },
  lime: {
    text: "text-lime-700 dark:text-lime-300",
    bg: "bg-lime-500/10 dark:bg-lime-400/10",
    border: "border-lime-500/25 dark:border-lime-400/25",
    dot: "bg-lime-500",
    bar: "bg-lime-500",
  },
  fuchsia: {
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    bg: "bg-fuchsia-500/10 dark:bg-fuchsia-400/10",
    border: "border-fuchsia-500/25 dark:border-fuchsia-400/25",
    dot: "bg-fuchsia-500",
    bar: "bg-fuchsia-500",
  },
  sky: {
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/10 dark:bg-sky-400/10",
    border: "border-sky-500/25 dark:border-sky-400/25",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  slate: {
    text: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-500/10 dark:bg-slate-400/10",
    border: "border-slate-500/25 dark:border-slate-400/25",
    dot: "bg-slate-500",
    bar: "bg-slate-500",
  },
};

export function swatch(color: ColorToken): Swatch {
  return SWATCHES[color] ?? SWATCHES.slate;
}
