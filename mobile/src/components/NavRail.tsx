import { StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { PressableScale, type IconName } from "./ui";

export type ViewKey = "grid" | "list" | "teachers" | "share";

const ITEMS: { key: ViewKey; label: string; icon: IconName; activeIcon: IconName }[] = [
  { key: "grid", label: "Grid", icon: "grid-outline", activeIcon: "grid" },
  { key: "list", label: "List", icon: "list-outline", activeIcon: "list" },
  { key: "teachers", label: "Teachers", icon: "people-outline", activeIcon: "people" },
  {
    key: "share",
    label: "Share",
    icon: "share-social-outline",
    activeIcon: "share-social",
  },
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
              width: 148,
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
              paddingTop: SPACING.xs,
            }
      }
    >
      {ITEMS.map((item) => {
        const active = item.key === current;
        const color = active
          ? expanded
            ? theme.accentText
            : theme.accent
          : theme.fgMuted;

        return (
          <PressableScale
            key={item.key}
            label={item.label}
            selected={active}
            pressedScale={0.93}
            onPress={() => {
              onChange(item.key);
            }}
            style={
              expanded
                ? {
                    backgroundColor: active ? theme.accent : "transparent",
                    borderRadius: RADIUS.md,
                    paddingVertical: 11,
                    paddingHorizontal: SPACING.md,
                    minHeight: 44,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.sm,
                  }
                : {
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: SPACING.sm,
                    minHeight: 50,
                    justifyContent: "center",
                    gap: 2,
                  }
            }
          >
            <Ionicons
              name={active ? item.activeIcon : item.icon}
              size={expanded ? 17 : 20}
              color={color}
            />
            <Text
              style={{
                color,
                fontWeight: active ? "700" : "500",
                fontSize: expanded ? 14 : 11,
              }}
            >
              {item.label}
            </Text>
            {!expanded && active ? (
              <Animated.View
                entering={ZoomIn.duration(180)}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: RADIUS.pill,
                  backgroundColor: theme.accent,
                }}
              />
            ) : (
              <View style={expanded ? undefined : { width: 4, height: 4 }} />
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}
