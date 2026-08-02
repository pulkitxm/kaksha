import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { RADIUS, SPACING, SPRING, useTheme } from "../lib/theme";
import { Button, type IconName } from "./ui";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  icon?: IconName;
  destructive?: boolean;
  busy?: boolean;
  blocked?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  icon,
  destructive,
  busy,
  blocked,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.set(withSpring(1, SPRING));
    } else if (mounted) {
      progress.set(
        withTiming(0, { duration: 160 }, (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }),
      );
    }
  }, [visible, mounted, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: interpolate(progress.get(), [0, 1], [0.9, 1]) }],
  }));

  if (!mounted) return null;

  const accent = destructive ? theme.danger : theme.accent;

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: SPACING.xl,
        }}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "#000000ab" },
            backdropStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={{ flex: 1 }}
            onPress={busy ? undefined : onCancel}
          />
        </Animated.View>

        <Animated.View
          style={[
            cardStyle,
            {
              backgroundColor: theme.bg,
              borderColor: theme.line,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: RADIUS.xl,
              padding: SPACING.xl,
              width: "100%",
              maxWidth: 400,
              alignItems: "center",
            },
          ]}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: RADIUS.pill,
              backgroundColor: `${accent}1c`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: SPACING.md,
            }}
          >
            <Ionicons
              name={icon ?? (destructive ? "trash-outline" : "help-circle-outline")}
              size={26}
              color={accent}
            />
          </View>

          <Text
            style={{
              color: theme.fg,
              fontSize: 17,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: theme.fgMuted,
              fontSize: 13,
              lineHeight: 19,
              textAlign: "center",
              marginTop: SPACING.sm,
            }}
          >
            {message}
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: SPACING.md,
              marginTop: SPACING.xl,
              alignSelf: "stretch",
            }}
          >
            <View style={{ flex: 1 }}>
              <Button label="Cancel" onPress={onCancel} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={confirmLabel}
                variant={destructive ? "danger" : "primary"}
                busy={busy}
                disabled={blocked}
                onPress={onConfirm}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
