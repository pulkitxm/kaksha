import { useColorScheme } from "react-native";
import { THEMES, type SurfaceTheme } from "@kaksha/core";

export function useTheme(): SurfaceTheme {
  const scheme = useColorScheme();
  return scheme === "dark" ? THEMES.dark : THEMES.light;
}

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const RADIUS = { sm: 6, md: 10, lg: 14, pill: 999 } as const;
