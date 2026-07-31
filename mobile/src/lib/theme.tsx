import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { THEMES, type SurfaceTheme } from "@kaksha/core";

import { readJson, writeJson } from "./cache";

export type ThemeMode = "system" | "light" | "dark";

type ThemeModeValue = { mode: ThemeMode; setMode: (next: ThemeMode) => void };

const ThemeModeContext = createContext<ThemeModeValue | null>(null);

const MODE_KEY = "theme-mode";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    void readJson<ThemeMode>(MODE_KEY).then((saved) => {
      if (isThemeMode(saved)) setModeState(saved);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeJson(MODE_KEY, next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ThemeModeValue {
  const value = useContext(ThemeModeContext);
  if (!value) throw new Error("useThemeMode must be used inside ThemeModeProvider");
  return value;
}

export function useTheme(): SurfaceTheme {
  const scheme = useColorScheme();
  const mode = useContext(ThemeModeContext)?.mode ?? "system";
  const dark = mode === "system" ? scheme === "dark" : mode === "dark";
  return dark ? THEMES.dark : THEMES.light;
}

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const RADIUS = { sm: 6, md: 10, lg: 14, xl: 22, pill: 999 } as const;

export const SPRING = { damping: 26, stiffness: 300, mass: 0.9 } as const;

export const SPRING_SNAPPY = { damping: 20, stiffness: 420, mass: 0.7 } as const;
