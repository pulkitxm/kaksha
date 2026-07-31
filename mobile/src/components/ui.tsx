import { type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { subjectPaint, type SurfaceTheme } from "@kaksha/core";

import { RADIUS, SPACING, SPRING_SNAPPY, useTheme } from "../lib/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  onPress,
  disabled,
  label,
  selected,
  style,
  children,
  pressedScale = 0.96,
}: {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  pressedScale?: number;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.set(withSpring(pressedScale, SPRING_SNAPPY));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, SPRING_SNAPPY));
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
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
  busy,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  busy?: boolean;
  icon?: IconName;
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
  const inactive = disabled === true || busy === true;

  return (
    <PressableScale
      label={label}
      onPress={onPress}
      disabled={inactive}
      style={{
        backgroundColor: background,
        borderColor: variant === "secondary" ? theme.lineStrong : "transparent",
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.lg,
        paddingVertical: 11,
        opacity: inactive ? 0.45 : 1,
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: SPACING.sm,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <Ionicons name={icon} size={16} color={color} />
      ) : null}
      <Text style={{ color, fontWeight: "600", fontSize: 14, textAlign: "center" }}>
        {label}
      </Text>
    </PressableScale>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  disabled,
  tone = "default",
  size = 20,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "default" | "accent" | "danger";
  size?: number;
}) {
  const theme = useTheme();
  const color =
    tone === "accent" ? theme.accent : tone === "danger" ? theme.danger : theme.fgMuted;

  return (
    <PressableScale
      label={label}
      onPress={onPress}
      disabled={disabled}
      pressedScale={0.88}
      style={{
        width: 38,
        height: 38,
        borderRadius: RADIUS.pill,
        backgroundColor: theme.bgSubtle,
        borderColor: theme.line,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Ionicons name={icon} size={size} color={color} />
    </PressableScale>
  );
}

export function Chip({
  label,
  active,
  onPress,
  tone,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tone?: "accent" | "danger";
  icon?: IconName;
}) {
  const theme = useTheme();
  const activeColor = tone === "danger" ? theme.danger : theme.accent;
  const activeText = tone === "danger" ? "#ffffff" : theme.accentText;

  return (
    <PressableScale
      label={label}
      selected={active}
      onPress={onPress}
      style={{
        backgroundColor: active ? activeColor : theme.panel,
        borderColor: active ? activeColor : theme.lineStrong,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: RADIUS.pill,
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        justifyContent: "center",
      }}
    >
      {icon ? (
        <Ionicons name={icon} size={13} color={active ? activeText : theme.fgMuted} />
      ) : null}
      <Text style={{ color: active ? activeText : theme.fg, fontSize: 13 }}>{label}</Text>
    </PressableScale>
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
