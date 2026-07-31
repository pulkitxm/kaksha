import { Fragment } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  formatDayRange,
  type DerivedView,
  type ResolvedDataset,
  type ResolvedEntry,
} from "@kaksha/core";

import { SubjectChip } from "../components/ui";
import { useLayout } from "../lib/layout";
import { RADIUS, SPACING, useTheme } from "../lib/theme";

const SECTION_COLUMN = 96;

export function GridView({
  dataset,
  derived,
  onEdit,
  onCreate,
}: {
  dataset: ResolvedDataset;
  derived: DerivedView;
  onEdit: (entry: ResolvedEntry) => void;
  onCreate: (sectionId: string, periodId: number) => void;
}) {
  const theme = useTheme();
  const layout = useLayout();
  const cellWidth = layout.isTablet ? 148 : 124;

  const visible = derived.filtersActive
    ? derived.entries.filter((entry) => entry.matched)
    : derived.entries;

  const byCell = new Map<string, ResolvedEntry[]>();
  for (const entry of visible) {
    const key = `${entry.sectionId}:${String(entry.periodId)}`;
    const bucket = byCell.get(key);
    if (bucket) bucket.push(entry);
    else byCell.set(key, [entry]);
  }

  return (
    <View
      style={{
        borderColor: theme.line,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: RADIUS.lg,
        overflow: "hidden",
        backgroundColor: theme.panel,
      }}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={{ flexDirection: "row", backgroundColor: theme.bgSubtle }}>
            <View
              style={{
                width: SECTION_COLUMN,
                padding: SPACING.sm,
                borderRightColor: theme.line,
                borderRightWidth: StyleSheet.hairlineWidth,
              }}
            >
              <Text style={{ color: theme.fgFaint, fontSize: 10, letterSpacing: 0.6 }}>
                SECTION
              </Text>
            </View>
            {dataset.periods.map((period) => (
              <View
                key={period.id}
                style={{
                  width: cellWidth,
                  padding: SPACING.sm,
                  alignItems: "center",
                  borderRightColor: theme.line,
                  borderRightWidth: StyleSheet.hairlineWidth,
                }}
              >
                <Text style={{ color: theme.fg, fontWeight: "700", fontSize: 14 }}>
                  {period.label}
                </Text>
                {period.name !== period.label ? (
                  <Text style={{ color: theme.fgFaint, fontSize: 9 }}>
                    {period.name.toUpperCase()}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>

          {dataset.sections.map((section) => {
            const matches = visible.filter((entry) => entry.sectionId === section.id);

            return (
              <View
                key={section.id}
                style={{
                  flexDirection: "row",
                  borderTopColor: theme.line,
                  borderTopWidth: StyleSheet.hairlineWidth,
                }}
              >
                <View
                  style={{
                    width: SECTION_COLUMN,
                    padding: SPACING.sm,
                    borderRightColor: theme.line,
                    borderRightWidth: StyleSheet.hairlineWidth,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: RADIUS.sm,
                      borderColor: theme.lineStrong,
                      borderWidth: StyleSheet.hairlineWidth,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: theme.bgSubtle,
                    }}
                  >
                    <Text style={{ color: theme.fg, fontWeight: "700" }}>
                      {section.name}
                    </Text>
                  </View>
                  {section.electives.length > 0 ? (
                    <Text style={{ color: theme.fgFaint, fontSize: 9, marginTop: 4 }}>
                      {section.electives.map((subject) => subject.code).join(" · ")}
                    </Text>
                  ) : null}
                </View>

                {derived.filtersActive && matches.length === 0 ? (
                  <View
                    style={{
                      flex: 1,
                      padding: SPACING.md,
                      justifyContent: "center",
                      width: cellWidth * dataset.periods.length,
                    }}
                  >
                    <Text style={{ color: theme.fgFaint, fontSize: 11 }}>
                      No matching lectures
                    </Text>
                  </View>
                ) : (
                  dataset.periods.map((period) => {
                    const cell = byCell.get(`${section.id}:${String(period.id)}`) ?? [];
                    return (
                      <View
                        key={period.id}
                        style={{
                          width: cellWidth,
                          padding: 4,
                          gap: 4,
                          borderRightColor: theme.line,
                          borderRightWidth: StyleSheet.hairlineWidth,
                        }}
                      >
                        {cell.length === 0 ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Add a lecture for section ${section.name}, period ${period.label}`}
                            onPress={() => {
                              onCreate(section.id, period.id);
                            }}
                            style={({ pressed }) => ({
                              borderRadius: RADIUS.sm,
                              paddingVertical: SPACING.md,
                              alignItems: "center",
                              backgroundColor: pressed ? theme.panelHover : "transparent",
                            })}
                          >
                            <Text style={{ color: theme.fgFaint }}>+</Text>
                          </Pressable>
                        ) : (
                          cell.map((entry) => (
                            <Pressable
                              key={entry.id}
                              accessibilityRole="button"
                              accessibilityLabel={`Edit ${entry.assignments
                                .map((a) => a.subject.code)
                                .join(" ")}`}
                              onPress={() => {
                                onEdit(entry);
                              }}
                              style={({ pressed }) => ({
                                borderRadius: RADIUS.sm,
                                padding: 5,
                                backgroundColor: pressed
                                  ? theme.panelHover
                                  : "transparent",
                                borderColor: theme.line,
                                borderWidth: StyleSheet.hairlineWidth,
                              })}
                            >
                              <Text style={{ color: theme.fgFaint, fontSize: 9 }}>
                                {formatDayRange(entry.dayIds)}
                              </Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  flexWrap: "wrap",
                                  gap: 3,
                                  marginTop: 2,
                                }}
                              >
                                {entry.assignments.map((assignment, index) => (
                                  <Fragment key={`${entry.id}-${String(index)}`}>
                                    <SubjectChip
                                      code={assignment.subject.code}
                                      color={assignment.subject.color}
                                      theme={theme}
                                      compact
                                    />
                                  </Fragment>
                                ))}
                              </View>
                              <Text
                                style={{
                                  color: theme.fgMuted,
                                  fontSize: 10,
                                  marginTop: 2,
                                }}
                                numberOfLines={2}
                              >
                                {entry.assignments
                                  .map((a) => a.teacher?.name ?? "Unassigned")
                                  .join(" / ")}
                              </Text>
                            </Pressable>
                          ))
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
