import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  dayNames,
  pluralize,
  type Clash,
  type ResolvedDataset,
  type ResolvedEntry,
} from "@kaksha/core";

import {
  Banner,
  Card,
  Chip,
  CountPill,
  EmptyState,
  PressableScale,
  ScreenHeading,
  SubjectChip,
} from "../components/ui";
import { SPACING, RADIUS, useTheme } from "../lib/theme";

type Filter = "all" | "section" | "teacher" | "elective";

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
  const teacherCount = clashes.filter((clash) => clash.kind === "teacher").length;
  const electiveCount = clashes.filter((clash) => clash.kind === "elective").length;
  const problemCount = sectionCount + teacherCount;

  const visible = clashes.filter((clash) =>
    filter === "all" ? clash.kind !== "elective" : clash.kind === filter,
  );

  return (
    <View>
      <ScreenHeading
        title="Clashes"
        hint={
          problemCount === 0
            ? electiveCount > 0
              ? `Nothing overlaps. ${pluralize(electiveCount, "combined elective group")} below.`
              : "Nothing overlaps in this class"
            : `${String(sectionCount)} section overlaps, ${String(teacherCount)} teacher overlaps`
        }
      />

      {clashes.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: SPACING.sm,
            marginBottom: SPACING.md,
          }}
        >
          <Chip
            label={`All ${String(problemCount)}`}
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
          {electiveCount > 0 ? (
            <Chip
              label={`Elective groups ${String(electiveCount)}`}
              active={filter === "elective"}
              onPress={() => {
                setFilter("elective");
              }}
            />
          ) : null}
        </View>
      ) : null}

      {filter === "elective" && electiveCount > 0 ? (
        <View style={{ marginBottom: SPACING.md }}>
          <Banner
            text="These are not problems. One teacher takes one elective subject for several sections at once, which is how a combined group is meant to look."
            tone="info"
          />
        </View>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title={problemCount === 0 ? "No clashes" : "Nothing in this filter"}
          hint={
            problemCount === 0
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
          const calm = clash.kind === "elective";
          const accent = calm ? theme.accent : theme.danger;
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
                  borderColor: `${accent}59`,
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
                      backgroundColor: `${accent}1f`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={
                        clash.kind === "section" ? "albums" : calm ? "people" : "person"
                      }
                      size={16}
                      color={accent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.fg, fontWeight: "700", fontSize: 15 }}>
                      {heading}
                    </Text>
                    <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 1 }}>
                      {clash.kind === "section"
                        ? "Two lectures share the same slot"
                        : calm
                          ? `Takes one elective group across ${pluralize(entries.length, "section")}`
                          : entries.length === 1
                            ? "Teaching two subjects in the same slot"
                            : "Booked in two places at once"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <CountPill
                      label={`Period ${period?.label ?? String(clash.periodId)}`}
                      tone={calm ? undefined : "danger"}
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
