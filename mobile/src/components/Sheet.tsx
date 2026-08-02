import { useEffect, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RADIUS, SPACING, SPRING, useTheme } from "../lib/theme";
import { IconButton } from "./ui";

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onDismissed?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
};

export function Sheet({
  visible,
  title,
  subtitle,
  onClose,
  onDismissed,
  children,
  footer,
  scroll = true,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);
  const panelHeight = useSharedValue(windowHeight);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      dragY.set(0);
      progress.set(withSpring(1, SPRING));
    } else if (mounted) {
      const settle = () => {
        setMounted(false);
        onDismissed?.();
      };
      progress.set(
        withTiming(0, { duration: 200 }, (finished) => {
          if (finished) runOnJS(settle)();
        }),
      );
    }
  }, [visible, mounted, progress, dragY, onDismissed]);

  const drag = Gesture.Pan()
    .onUpdate((event) => {
      dragY.set(event.translationY >= 0 ? event.translationY : event.translationY / 14);
    })
    .onEnd((event) => {
      if (event.translationY > 132 || event.velocityY > 900) {
        runOnJS(onClose)();
      } else {
        dragY.set(withSpring(0, SPRING));
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      progress.get() * interpolate(dragY.get(), [0, 360], [1, 0.3], Extrapolation.CLAMP),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          interpolate(progress.get(), [0, 1], [panelHeight.get(), 0]) +
          Math.max(dragY.get(), -40),
      },
    ],
  }));

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "#000000ab" },
            backdropStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
            style={{ flex: 1 }}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          onLayout={(event) => {
            panelHeight.set(event.nativeEvent.layout.height);
          }}
          style={[
            panelStyle,
            {
              backgroundColor: theme.bg,
              borderTopLeftRadius: RADIUS.xl,
              borderTopRightRadius: RADIUS.xl,
              borderColor: theme.line,
              borderWidth: StyleSheet.hairlineWidth,
              maxHeight: windowHeight - insets.top - SPACING.xl,
              overflow: "hidden",
            },
          ]}
        >
          <GestureDetector gesture={drag}>
            <View>
              <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: RADIUS.pill,
                    backgroundColor: theme.lineStrong,
                  }}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: SPACING.lg,
                  paddingTop: SPACING.md,
                  paddingBottom: SPACING.md,
                  gap: SPACING.md,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.fg, fontSize: 18, fontWeight: "700" }}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 2 }}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <IconButton icon="close" label="Close" onPress={onClose} />
              </View>
            </View>
          </GestureDetector>

          {scroll ? (
            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: SPACING.md }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={{ flexShrink: 1 }}>{children}</View>
          )}

          {footer ? (
            <View
              style={{
                borderTopColor: theme.line,
                borderTopWidth: StyleSheet.hairlineWidth,
                padding: SPACING.lg,
                paddingBottom: SPACING.lg + insets.bottom,
                backgroundColor: theme.bg,
              }}
            >
              {footer}
            </View>
          ) : (
            <View style={{ height: insets.bottom + SPACING.md }} />
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
