import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { subjectPaint, type SurfaceTheme } from "@kaksha/core";

import { RADIUS, SPACING, useTheme } from "../lib/theme";

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.panel,
          borderColor: theme.line,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: RADIUS.lg,
          padding: SPACING.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  const theme = useTheme();
  return (
    <Card style={{ flexGrow: 1, flexBasis: 150, padding: SPACING.md }}>
      <Text style={{ color: theme.fgFaint, fontSize: 11, letterSpacing: 0.8 }}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          color: theme.fg,
          fontSize: 26,
          fontWeight: "700",
          marginTop: SPACING.xs,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 2 }}>{hint}</Text>
    </Card>
  );
}

export function SubjectChip({
  code,
  color,
  theme,
  compact,
}: {
  code: string;
  color: string;
  theme: SurfaceTheme;
  compact?: boolean;
}) {
  const paint = subjectPaint(color, theme);
  return (
    <View
      style={{
        backgroundColor: paint.background,
        borderColor: paint.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: RADIUS.sm,
        paddingHorizontal: compact ? 5 : 7,
        paddingVertical: compact ? 2 : 3,
      }}
    >
      <Text
        style={{ color: paint.accent, fontSize: compact ? 11 : 12, fontWeight: "600" }}
      >
        {code}
      </Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "secondary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const theme = useTheme();
  const background =
    variant === "primary"
      ? theme.accent
      : variant === "danger"
        ? theme.danger
        : theme.panel;
  const color =
    variant === "secondary"
      ? theme.fg
      : variant === "primary"
        ? theme.accentText
        : "#ffffff";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: background,
        borderColor: variant === "secondary" ? theme.lineStrong : "transparent",
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.lg,
        paddingVertical: 11,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        minHeight: 44,
        justifyContent: "center",
      })}
    >
      <Text style={{ color, fontWeight: "600", fontSize: 14, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Banner({ text, tone }: { text: string; tone: "error" | "info" }) {
  const theme = useTheme();
  const color = tone === "error" ? theme.danger : theme.fgMuted;
  return (
    <View
      style={{
        borderColor: color,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        backgroundColor: `${color}14`,
      }}
    >
      <Text style={{ color, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  const theme = useTheme();
  return (
    <Card style={{ alignItems: "center", paddingVertical: SPACING.xl * 2 }}>
      <Text style={{ color: theme.fg, fontWeight: "600", fontSize: 15 }}>{title}</Text>
      <Text style={{ color: theme.fgMuted, fontSize: 13, marginTop: SPACING.xs }}>
        {hint}
      </Text>
    </Card>
  );
}
