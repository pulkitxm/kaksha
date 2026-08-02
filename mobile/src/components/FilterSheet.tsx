import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  applyFilters,
  EMPTY_FILTERS,
  type FilterOptions,
  type Filters,
  type ResolvedDataset,
} from "@kaksha/core";

import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { SelectField } from "./Select";
import { Sheet } from "./Sheet";
import { Button, Chip } from "./ui";

type Props = {
  visible: boolean;
  dataset: ResolvedDataset;
  options: FilterOptions;
  filters: Filters;
  onApply: (next: Filters) => void;
  onClose: () => void;
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <Text
        style={{
          color: theme.fgFaint,
          fontSize: 11,
          letterSpacing: 0.8,
          marginBottom: SPACING.sm,
        }}
      >
        {title.toUpperCase()}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {children}
      </View>
    </View>
  );
}

export function FilterSheet({
  visible,
  dataset,
  options,
  filters,
  onApply,
  onClose,
}: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState<Filters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const departmentById = useMemo(
    () => new Map(dataset.teachers.map((teacher) => [teacher.id, teacher.department])),
    [dataset.teachers],
  );

  const teacherOptions = useMemo(
    () =>
      options.teachers.map((teacher) => ({
        id: teacher.id,
        label: teacher.name,
        sublabel: departmentById.get(teacher.id) ?? undefined,
        badge: `${String(teacher.lectures)} lec`,
      })),
    [options.teachers, departmentById],
  );

  const subjectOptions = useMemo(
    () =>
      options.subjects.map((subject) => ({
        id: subject.id,
        label: `${subject.code} · ${subject.name}`,
        color: subject.color,
        badge: `${String(subject.lectures)} lec`,
      })),
    [options.subjects],
  );

  const matched = useMemo(
    () => applyFilters(dataset, draft).stats.matchedLectures,
    [dataset, draft],
  );

  return (
    <Sheet
      visible={visible}
      title="Filters"
      subtitle="Narrow the timetable down"
      onClose={onClose}
      footer={
        <View style={{ flexDirection: "row", gap: SPACING.md }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Clear"
              onPress={() => {
                setDraft(EMPTY_FILTERS);
                onApply(EMPTY_FILTERS);
              }}
            />
          </View>
          <View style={{ flex: 2 }}>
            <Button
              label={`Show ${String(matched)} lectures`}
              variant="primary"
              onPress={() => {
                onApply(draft);
                onClose();
              }}
            />
          </View>
        </View>
      }
    >
      <View style={{ paddingHorizontal: SPACING.lg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SPACING.sm,
            backgroundColor: theme.bgSubtle,
            borderColor: theme.line,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: RADIUS.md,
            paddingHorizontal: SPACING.md,
            marginBottom: SPACING.lg,
          }}
        >
          <Ionicons name="search" size={16} color={theme.fgFaint} />
          <TextInput
            value={draft.q}
            onChangeText={(text) => {
              setDraft({ ...draft, q: text.toLowerCase() });
            }}
            placeholder="Search teacher, subject, note"
            placeholderTextColor={theme.fgFaint}
            style={{ flex: 1, color: theme.fg, minHeight: 44, fontSize: 14 }}
          />
        </View>

        <View style={{ gap: SPACING.lg, marginBottom: SPACING.lg }}>
          <SelectField
            label="Teachers"
            placeholder="All teachers"
            options={teacherOptions}
            selected={draft.teacher}
            multi
            onChange={(ids) => {
              setDraft({ ...draft, teacher: ids });
            }}
          />
          <SelectField
            label="Subjects"
            placeholder="All subjects"
            options={subjectOptions}
            selected={draft.subject}
            multi
            onChange={(ids) => {
              setDraft({ ...draft, subject: ids });
            }}
          />
        </View>

        <FilterGroup title="Section">
          {options.sections.map((section) => (
            <Chip
              key={section.id}
              label={section.name}
              active={draft.section.includes(section.id)}
              onPress={() => {
                setDraft({ ...draft, section: toggle(draft.section, section.id) });
              }}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Day">
          {options.days.map((day) => (
            <Chip
              key={day.id}
              label={day.short}
              active={draft.day.includes(day.id)}
              onPress={() => {
                setDraft({ ...draft, day: toggle(draft.day, day.id) });
              }}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Period">
          {options.periods.map((period) => (
            <Chip
              key={period.id}
              label={period.label}
              active={draft.period.includes(period.id)}
              onPress={() => {
                setDraft({ ...draft, period: toggle(draft.period, period.id) });
              }}
            />
          ))}
        </FilterGroup>
      </View>
    </Sheet>
  );
}
