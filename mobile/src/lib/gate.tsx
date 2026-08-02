import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { ConnectView } from "../screens/ConnectView";
import {
  clearAccessCode,
  loadAccessCode,
  saveAccessCode,
  whenAccessRejected,
} from "./access";
import { log } from "./log";
import { useTheme } from "./theme";

type Phase = "checking" | "new" | "rejected" | "connected";

export function AccessGate({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [phase, setPhase] = useState<Phase>("checking");

  useEffect(() => {
    let cancelled = false;

    void loadAccessCode().then((code) => {
      if (!cancelled) setPhase(code ? "connected" : "new");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    whenAccessRejected(() => {
      log.error("access", "The server refused this device, asking for the code again");
      void clearAccessCode().then(() => {
        setPhase("rejected");
      });
    });

    return () => {
      whenAccessRejected(null);
    };
  }, []);

  const connect = useCallback(async (code: string) => {
    await saveAccessCode(code);
    log.info("access", "This device is connected");
    setPhase("connected");
  }, []);

  if (phase === "checking") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (phase === "connected") return <>{children}</>;

  return <ConnectView reason={phase} onConnected={connect} />;
}
