import { useColorScheme } from "react-native";
import { THEMES, type SurfaceTheme } from "@kaksha/core";

export function useTheme(): SurfaceTheme {
  const scheme = useColorScheme();
  return scheme === "dark" ? THEMES.dark : THEMES.light;
}

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const RADIUS = { sm: 6, md: 10, lg: 14, xl: 22, pill: 999 } as const;

export const SPRING = { damping: 26, stiffness: 300, mass: 0.9 } as const;

export const SPRING_SNAPPY = { damping: 20, stiffness: 420, mass: 0.7 } as const;
