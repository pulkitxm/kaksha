import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { PressableScale, type IconName } from "./ui";

export type ViewKey =
  | "timetable"
  | "clashes"
  | "teachers"
  | "subjects"
  | "sections"
  | "classes"
  | "notes"
  | "share";

type Item = { key: ViewKey; label: string; icon: IconName; activeIcon: IconName };

const ITEMS: Item[] = [
  {
    key: "timetable",
    label: "Timetable",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
  { key: "clashes", label: "Clashes", icon: "warning-outline", activeIcon: "warning" },
  { key: "teachers", label: "Teachers", icon: "people-outline", activeIcon: "people" },
  { key: "subjects", label: "Subjects", icon: "book-outline", activeIcon: "book" },
  { key: "sections", label: "Sections", icon: "albums-outline", activeIcon: "albums" },
  { key: "classes", label: "Classes", icon: "school-outline", activeIcon: "school" },
  {
    key: "notes",
    label: "Notes",
    icon: "document-text-outline",
    activeIcon: "document-text",
  },
  {
    key: "share",
    label: "Share",
    icon: "share-social-outline",
    activeIcon: "share-social",
  },
];

const EXPANDED_WIDTH = 156;
const RAIL_WIDTH = 68;

function Row({
  icon,
  label,
  active,
  expanded,
  badge,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  expanded: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = active ? theme.accentText : theme.fgMuted;

  return (
    <PressableScale
      label={label}
      selected={active}
      pressedScale={0.95}
      onPress={onPress}
      style={{
        backgroundColor: active ? theme.accent : "transparent",
        borderRadius: RADIUS.md,
        paddingVertical: expanded ? 10 : 8,
        paddingHorizontal: expanded ? SPACING.md : SPACING.xs,
        minHeight: 44,
        flexDirection: expanded ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: expanded ? SPACING.sm : 3,
      }}
    >
      <View>
        <Ionicons name={icon} size={expanded ? 17 : 19} color={color} />
        {badge !== undefined && badge > 0 ? (
          <Animated.View
            entering={ZoomIn.duration(180)}
            style={{
              position: "absolute",
              top: -5,
              right: -8,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 4,
              borderRadius: RADIUS.pill,
              backgroundColor: theme.danger,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "700" }}>
              {badge > 99 ? "99+" : badge}
            </Text>
          </Animated.View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        style={{
          color,
          fontWeight: active ? "700" : "500",
          fontSize: expanded ? 14 : 9,
          flex: expanded ? 1 : undefined,
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

export function Sidebar({
  current,
  expanded,
  clashCount,
  onChange,
  onOpenSettings,
}: {
  current: ViewKey;
  expanded: boolean;
  clashCount: number;
  onChange: (next: ViewKey) => void;
  onOpenSettings: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        width: expanded ? EXPANDED_WIDTH : RAIL_WIDTH,
        borderRightColor: theme.line,
        borderRightWidth: StyleSheet.hairlineWidth,
        backgroundColor: theme.bgSubtle,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
      }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACING.xs }}
      >
        {ITEMS.map((item) => (
          <Row
            key={item.key}
            icon={item.key === current ? item.activeIcon : item.icon}
            label={item.label}
            active={item.key === current}
            expanded={expanded}
            badge={item.key === "clashes" ? clashCount : undefined}
            onPress={() => {
              onChange(item.key);
            }}
          />
        ))}
      </ScrollView>

      <View
        style={{
          borderTopColor: theme.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: SPACING.sm,
          marginTop: SPACING.sm,
        }}
      >
        <Row
          icon="settings-outline"
          label="Settings"
          active={false}
          expanded={expanded}
          onPress={onOpenSettings}
        />
      </View>
    </View>
  );
}
