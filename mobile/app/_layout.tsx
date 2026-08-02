import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "../src/components/Toast";
import { NotesProvider } from "../src/lib/notes";
import { StoreProvider } from "../src/lib/store";
import { ThemeModeProvider, useTheme } from "../src/lib/theme";

function ThemedShell() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeModeProvider>
          <ToastProvider>
            <StoreProvider>
              <NotesProvider>
                <ThemedShell />
              </NotesProvider>
            </StoreProvider>
          </ToastProvider>
        </ThemeModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
