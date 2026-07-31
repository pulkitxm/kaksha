import { Pressable, StyleSheet, Text, View } from "react-native";

import { RADIUS, SPACING, useTheme } from "../lib/theme";

export type ViewKey = "grid" | "list" | "teachers" | "share";

const ITEMS: { key: ViewKey; label: string }[] = [
  { key: "grid", label: "Grid" },
  { key: "list", label: "List" },
  { key: "teachers", label: "Teachers" },
  { key: "share", label: "Share" },
];

export function NavRail({
  current,
  onChange,
  expanded,
}: {
  current: ViewKey;
  onChange: (next: ViewKey) => void;
  expanded?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={
        expanded
          ? {
              width: 132,
              borderRightColor: theme.line,
              borderRightWidth: StyleSheet.hairlineWidth,
              paddingVertical: SPACING.lg,
              paddingHorizontal: SPACING.sm,
              gap: SPACING.xs,
              backgroundColor: theme.bgSubtle,
            }
          : {
              flexDirection: "row",
              borderTopColor: theme.line,
              borderTopWidth: StyleSheet.hairlineWidth,
              backgroundColor: theme.bgSubtle,
              paddingBottom: SPACING.sm,
            }
      }
    >
      {ITEMS.map((item) => {
        const active = item.key === current;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              onChange(item.key);
            }}
            style={
              expanded
                ? {
                    backgroundColor: active ? theme.accent : "transparent",
                    borderRadius: RADIUS.md,
                    paddingVertical: 12,
                    paddingHorizontal: SPACING.md,
                    minHeight: 44,
                    justifyContent: "center",
                  }
                : {
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: SPACING.md,
                    minHeight: 48,
                    justifyContent: "center",
                  }
            }
          >
            <Text
              style={{
                color: active
                  ? expanded
                    ? theme.accentText
                    : theme.accent
                  : theme.fgMuted,
                fontWeight: active ? "700" : "500",
                fontSize: expanded ? 14 : 13,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
