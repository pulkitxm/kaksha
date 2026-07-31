import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeOutDown,
  LinearTransition,
  SlideInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { type IconName } from "./ui";

type Tone = "success" | "error" | "info";

type ToastItem = { id: number; message: string; tone: Tone };

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

const TONE_ICONS: Record<Tone, IconName> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: Tone = "info") => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2800);
  }, []);

  const toneColor = useMemo(
    () => ({
      success: theme.accent,
      error: theme.danger,
      info: theme.fgMuted,
    }),
    [theme],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: insets.bottom + 68,
          alignItems: "center",
          gap: SPACING.sm,
        }}
      >
        {toasts.map((toast) => (
          <Animated.View
            key={toast.id}
            entering={SlideInDown.springify().damping(19).stiffness(240)}
            exiting={FadeOutDown.duration(180)}
            layout={LinearTransition.springify().damping(19).stiffness(240)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.sm,
              backgroundColor: theme.isDark ? "#242424" : "#1c1c1c",
              borderColor: theme.isDark ? theme.lineStrong : "transparent",
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: RADIUS.pill,
              paddingVertical: 10,
              paddingHorizontal: SPACING.lg,
              maxWidth: "88%",
            }}
          >
            <Ionicons
              name={TONE_ICONS[toast.tone]}
              size={16}
              color={toast.tone === "info" ? "#d4d4d4" : toneColor[toast.tone]}
            />
            <Text style={{ color: "#f5f5f5", fontSize: 13 }} numberOfLines={2}>
              {toast.message}
            </Text>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string, tone?: Tone) => void {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside ToastProvider");
  return show;
}
