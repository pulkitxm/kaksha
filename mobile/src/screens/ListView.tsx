import { Pressable, StyleSheet, Text, View, type DimensionValue } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  dayNames,
  formatDayRange,
  type DerivedView,
  type ResolvedDataset,
  type ResolvedEntry,
} from "@kaksha/core";

import { EmptyState, SubjectChip } from "../components/ui";
import { useLayout } from "../lib/layout";
import { RADIUS, SPACING, useTheme } from "../lib/theme";

export function ListView({
  dataset,
  derived,
  onEdit,
}: {
  dataset: ResolvedDataset;
  derived: DerivedView;
  onEdit: (entry: ResolvedEntry) => void;
}) {
  const theme = useTheme();
  const layout = useLayout();

  const sectionOrder = new Map(
    dataset.sections.map((section, index) => [section.id, index]),
  );
  const sectionName = new Map(
    dataset.sections.map((section) => [section.id, section.name]),
  );
  const periodById = new Map(dataset.periods.map((period) => [period.id, period]));

  const rows = derived.entries
    .filter((entry) => entry.matched)
    .sort(
      (a, b) =>
        (sectionOrder.get(a.sectionId) ?? 0) - (sectionOrder.get(b.sectionId) ?? 0) ||
        a.periodId - b.periodId,
    );

  if (rows.length === 0) {
    return <EmptyState title="No lectures match" hint="Try clearing a filter" />;
  }

  return (
    <View style={{ gap: SPACING.sm }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: SPACING.sm,
        }}
      >
        {rows.map((entry) => {
          const period = periodById.get(entry.periodId);
          return (
            <Animated.View
              key={entry.id}
              entering={FadeIn.duration(180)}
              style={{
                width: (layout.columns === 1
                  ? "100%"
                  : `${String(100 / layout.columns - 1)}%`) as DimensionValue,
              }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onEdit(entry);
                }}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? theme.panelHover : theme.panel,
                  borderColor: theme.line,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: RADIUS.md,
                  padding: SPACING.md,
                })}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: SPACING.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: RADIUS.sm,
                        backgroundColor: theme.bgSubtle,
                        borderColor: theme.lineStrong,
                        borderWidth: StyleSheet.hairlineWidth,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: theme.fg, fontWeight: "700", fontSize: 12 }}>
                        {sectionName.get(entry.sectionId) ?? "?"}
                      </Text>
                    </View>
                    <Text style={{ color: theme.fgMuted, fontSize: 12 }}>
                      Period {period?.label ?? entry.periodId}
                    </Text>
                  </View>
                  <Text style={{ color: theme.fgFaint, fontSize: 11 }}>
                    {formatDayRange(entry.dayIds)}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: SPACING.xs,
                    marginTop: SPACING.sm,
                  }}
                >
                  {entry.assignments.map((assignment, index) => (
                    <SubjectChip
                      key={`${entry.id}-${String(index)}`}
                      code={assignment.subject.code}
                      color={assignment.subject.color}
                      theme={theme}
                    />
                  ))}
                </View>

                <Text style={{ color: theme.fg, fontSize: 13, marginTop: SPACING.xs }}>
                  {entry.assignments
                    .map((a) => a.teacher?.name ?? "Unassigned")
                    .join(" / ")}
                </Text>
                <Text style={{ color: theme.fgFaint, fontSize: 11, marginTop: 2 }}>
                  {dayNames(entry.dayIds, dataset.days)}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
