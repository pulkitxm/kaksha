import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { SPACING, useTheme } from "../lib/theme";
import { IconButton } from "./ui";

export function DetailScreen({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top", "left", "right"]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          borderBottomColor: theme.line,
          borderBottomWidth: StyleSheet.hairlineWidth,
          gap: SPACING.md,
        }}
      >
        <IconButton
          icon="arrow-back"
          label="Back"
          onPress={() => {
            router.back();
          }}
        />
        <Text style={{ color: theme.fg, fontSize: 18, fontWeight: "700", flex: 1 }}>
          {title}
        </Text>
        {action}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            gap: SPACING.lg,
            width: "100%",
            maxWidth: 720,
            alignSelf: "center",
          }}
        >
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
