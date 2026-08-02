import { useRef, type ReactNode } from "react";
import { ScrollView, View } from "react-native";

import { SPACING } from "../lib/theme";
import type { ViewKey } from "./Sidebar";

export function TabHost({
  current,
  compact,
  tabs,
}: {
  current: ViewKey;
  compact: boolean;
  tabs: { key: ViewKey; render: () => ReactNode }[];
}) {
  const visited = useRef(new Set<ViewKey>());
  visited.current.add(current);

  return (
    <View style={{ flex: 1 }}>
      {tabs.map((tab) =>
        visited.current.has(tab.key) ? (
          <View
            key={tab.key}
            style={{ flex: 1, display: tab.key === current ? "flex" : "none" }}
          >
            <ScrollView
              contentContainerStyle={{
                padding: compact ? SPACING.sm : SPACING.lg,
                gap: SPACING.lg,
              }}
              showsVerticalScrollIndicator={false}
            >
              {tab.render()}
            </ScrollView>
          </View>
        ) : null,
      )}
    </View>
  );
}
