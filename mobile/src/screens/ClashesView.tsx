import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  dayNames,
  type Clash,
  type ResolvedDataset,
  type ResolvedEntry,
} from "@kaksha/core";

import {
  Card,
  Chip,
  CountPill,
  EmptyState,
  PressableScale,
  ScreenHeading,
  SubjectChip,
} from "../components/ui";
import { SPACING, RADIUS, useTheme } from "../lib/theme";

type Filter = "all" | "section" | "teacher";

export function ClashesView({
  dataset,
  clashes,
  onEdit,
}: {
  dataset: ResolvedDataset;
  clashes: Clash[];
  onEdit: (entry: ResolvedEntry) => void;
}) {
  const theme = useTheme();
  const [filter, setFilter] = useState<Filter>("all");

  const entryById = useMemo(
    () => new Map(dataset.entries.map((entry) => [entry.id, entry])),
    [dataset.entries],
  );
  const sectionById = useMemo(
    () => new Map(dataset.sections.map((section) => [section.id, section])),
    [dataset.sections],
  );
  const teacherById = useMemo(
    () => new Map(dataset.teachers.map((teacher) => [teacher.id, teacher])),
    [dataset.teachers],
  );
  const periodById = useMemo(
    () => new Map(dataset.periods.map((period) => [period.id, period])),
    [dataset.periods],
  );

  const sectionCount = clashes.filter((clash) => clash.kind === "section").length;
  const teacherCount = clashes.length - sectionCount;

  const visible = clashes.filter((clash) => filter === "all" || clash.kind === filter);

  return (
    <View>
      <ScreenHeading
        title="Clashes"
        hint={
          clashes.length === 0
            ? "Nothing overlaps in this class"
            : `${String(sectionCount)} section overlaps, ${String(teacherCount)} teacher overlaps`
        }
      />

      {clashes.length > 0 ? (
        <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
          <Chip
            label={`All ${String(clashes.length)}`}
            active={filter === "all"}
            onPress={() => {
              setFilter("all");
            }}
          />
          <Chip
            label={`Sections ${String(sectionCount)}`}
            active={filter === "section"}
            onPress={() => {
              setFilter("section");
            }}
          />
          <Chip
            label={`Teachers ${String(teacherCount)}`}
            active={filter === "teacher"}
            onPress={() => {
              setFilter("teacher");
            }}
          />
        </View>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title={clashes.length === 0 ? "No clashes" : "Nothing in this filter"}
          hint={
            clashes.length === 0
              ? "Every section and teacher sits in one place at a time"
              : "Switch the filter to see the rest"
          }
        />
      ) : null}

      <View style={{ gap: SPACING.sm }}>
        {visible.map((clash, index) => {
          const period = periodById.get(clash.periodId);
          const heading =
            clash.kind === "section"
              ? `Section ${sectionById.get(clash.sectionId ?? "")?.name ?? "?"}`
              : (teacherById.get(clash.teacherId ?? "")?.name ?? "Teacher");
          const entries = clash.entryIds
            .map((id) => entryById.get(id))
            .filter((entry): entry is ResolvedEntry => entry !== undefined);

          return (
            <Animated.View
              key={clash.id}
              entering={FadeInDown.delay(Math.min(index * 24, 240)).duration(200)}
            >
              <Card
                style={{
                  padding: SPACING.md,
                  gap: SPACING.md,
                  borderColor: `${theme.danger}59`,
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
                      width: 34,
                      height: 34,
                      borderRadius: RADIUS.pill,
                      backgroundColor: `${theme.danger}1f`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={clash.kind === "section" ? "albums" : "person"}
                      size={16}
                      color={theme.danger}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.fg, fontWeight: "700", fontSize: 15 }}>
                      {heading}
                    </Text>
                    <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 1 }}>
                      {clash.kind === "section"
                        ? "Two lectures share the same slot"
                        : entries.length === 1
                          ? "Teaching two subjects in the same slot"
                          : "Booked in two places at once"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <CountPill
                      label={`Period ${period?.label ?? String(clash.periodId)}`}
                      tone="danger"
                    />
                    <Text style={{ color: theme.fgFaint, fontSize: 11 }}>
                      {dayNames(clash.dayIds, dataset.days)}
                    </Text>
                  </View>
                </View>

                <View style={{ gap: SPACING.sm }}>
                  {entries.map((entry) => (
                    <PressableScale
                      key={`${clash.id}-${entry.id}`}
                      label="Open this lecture"
                      pressedScale={0.99}
                      onPress={() => {
                        onEdit(entry);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: SPACING.sm,
                        backgroundColor: theme.bgSubtle,
                        borderColor: theme.line,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderRadius: RADIUS.md,
                        padding: SPACING.sm,
                      }}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: RADIUS.sm,
                          borderColor: theme.lineStrong,
                          borderWidth: StyleSheet.hairlineWidth,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{ color: theme.fg, fontSize: 11, fontWeight: "700" }}
                        >
                          {sectionById.get(entry.sectionId)?.name ?? "?"}
                        </Text>
                      </View>

                      <View
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: SPACING.xs,
                          alignItems: "center",
                        }}
                      >
                        {entry.assignments.map((assignment, at) => (
                          <View
                            key={`${entry.id}-${String(at)}`}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <SubjectChip
                              code={assignment.subject.code}
                              color={assignment.subject.color}
                              theme={theme}
                              compact
                            />
                            <Text style={{ color: theme.fgMuted, fontSize: 12 }}>
                              {assignment.teacher?.name ?? "Unassigned"}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <Ionicons name="chevron-forward" size={15} color={theme.fgFaint} />
                    </PressableScale>
                  ))}
                </View>
              </Card>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
