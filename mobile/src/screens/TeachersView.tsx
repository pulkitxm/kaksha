import { useEffect } from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import type { DerivedView, ResolvedDataset } from "@kaksha/core";

import { Card, EmptyState, SubjectChip } from "../components/ui";
import { RADIUS, SPACING, SPRING, useTheme } from "../lib/theme";

function LoadBar({ fraction, delay }: { fraction: number; delay: number }) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(delay, withSpring(fraction, SPRING)));
  }, [fraction, delay, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${String(Math.min(progress.get(), 1) * 100)}%` as DimensionValue,
  }));

  return (
    <View
      style={{
        height: 6,
        backgroundColor: theme.bgSubtle,
        borderRadius: RADIUS.pill,
        marginTop: SPACING.sm,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          barStyle,
          {
            height: "100%",
            borderRadius: RADIUS.pill,
            backgroundColor: theme.accent,
          },
        ]}
      />
    </View>
  );
}

export function TeachersView({
  dataset,
  derived,
}: {
  dataset: ResolvedDataset;
  derived: DerivedView;
}) {
  const theme = useTheme();
  const periodsPerDay = dataset.periods.length;
  const peak =
    derived.teacherLoad.reduce((max, row) => Math.max(max, row.lectures), 0) || 1;
  const availability = new Map(
    derived.teacherAvailability.map((row) => [row.teacherId, row]),
  );

  if (derived.teacherLoad.length === 0) {
    return <EmptyState title="No teachers match" hint="Try clearing a filter" />;
  }

  return (
    <View style={{ gap: SPACING.sm }}>
      {derived.teacherLoad.map((row, index) => {
        const free = availability.get(row.teacherId);
        const delay = Math.min(index * 40, 320);
        return (
          <Animated.View
            key={row.teacherId}
            entering={FadeInDown.delay(delay).duration(220)}
          >
            <Card style={{ padding: SPACING.md }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: theme.fg, fontWeight: "700", fontSize: 15 }}>
                  {row.teacher}
                </Text>
                <Text style={{ color: theme.fg, fontSize: 15, fontWeight: "700" }}>
                  {row.lectures}
                </Text>
              </View>

              <LoadBar fraction={row.lectures / peak} delay={delay + 120} />

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: SPACING.xs,
                  marginTop: SPACING.sm,
                }}
              >
                {row.subjects.map((subject) => (
                  <SubjectChip
                    key={subject.id}
                    code={subject.code}
                    color={subject.color}
                    theme={theme}
                    compact
                  />
                ))}
              </View>

              {free ? (
                <View style={{ marginTop: SPACING.sm }}>
                  <Text
                    style={{ color: theme.fgFaint, fontSize: 10, letterSpacing: 0.6 }}
                  >
                    FREE PERIODS PER DAY
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                    {free.perDay.map((day) => {
                      const short =
                        dataset.days.find((item) => item.id === day.dayId)?.short ?? "?";
                      return (
                        <View
                          key={day.dayId}
                          style={{
                            flex: 1,
                            alignItems: "center",
                            paddingVertical: 4,
                            borderRadius: RADIUS.sm,
                            backgroundColor:
                              day.free === 0
                                ? `${theme.danger}22`
                                : day.free === periodsPerDay
                                  ? `${theme.accent}22`
                                  : theme.bgSubtle,
                          }}
                        >
                          <Text style={{ color: theme.fgFaint, fontSize: 9 }}>
                            {short}
                          </Text>
                          <Text
                            style={{ color: theme.fg, fontSize: 13, fontWeight: "600" }}
                          >
                            {day.free}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <Text style={{ color: theme.fgFaint, fontSize: 11, marginTop: SPACING.sm }}>
                {row.slots} slots across{" "}
                {row.sections
                  .map(
                    (id) =>
                      dataset.sections.find((section) => section.id === id)?.name ?? id,
                  )
                  .join(", ")}
              </Text>
            </Card>
          </Animated.View>
        );
      })}
      <View style={{ height: StyleSheet.hairlineWidth }} />
    </View>
  );
}
