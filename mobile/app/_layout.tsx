import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { StoreProvider } from "../src/lib/store";
import { useTheme } from "../src/lib/theme";

export default function RootLayout() {
  const theme = useTheme();

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style={theme.isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.bg },
          }}
        />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
