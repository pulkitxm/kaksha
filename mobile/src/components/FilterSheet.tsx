import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { FilterOptions, Filters } from "@kaksha/core";

import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { Button } from "./ui";

type Props = {
  visible: boolean;
  options: FilterOptions;
  filters: Filters;
  onApply: (next: Filters) => void;
  onClose: () => void;
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function FilterSheet({ visible, options, filters, onApply, onClose }: Props) {
  const theme = useTheme();
  const [draft, setDraft] = useState<Filters>(filters);

  function Chip({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        style={{
          backgroundColor: active ? theme.accent : theme.panel,
          borderColor: active ? theme.accent : theme.lineStrong,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: RADIUS.pill,
          paddingHorizontal: SPACING.md,
          paddingVertical: 8,
          marginRight: SPACING.sm,
          marginBottom: SPACING.sm,
          minHeight: 36,
          justifyContent: "center",
        }}
      >
        <Text style={{ color: active ? theme.accentText : theme.fg, fontSize: 13 }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{children}</View>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#00000099", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: RADIUS.lg,
            borderTopRightRadius: RADIUS.lg,
            maxHeight: "88%",
            paddingTop: SPACING.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: SPACING.lg,
              paddingBottom: SPACING.md,
            }}
          >
            <Text style={{ color: theme.fg, fontSize: 17, fontWeight: "700" }}>
              Filters
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
              <Text style={{ color: theme.fgMuted, fontSize: 15 }}>Close</Text>
            </Pressable>
          </View>

          <ScrollView style={{ paddingHorizontal: SPACING.lg }}>
            <TextInput
              value={draft.q}
              onChangeText={(text) => {
                setDraft({ ...draft, q: text.toLowerCase() });
              }}
              placeholder="Search teacher, subject, note"
              placeholderTextColor={theme.fgFaint}
              style={{
                borderColor: theme.lineStrong,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: RADIUS.md,
                color: theme.fg,
                paddingHorizontal: SPACING.md,
                paddingVertical: 11,
                marginBottom: SPACING.lg,
                minHeight: 44,
              }}
            />

            <Section title="Teacher">
              {options.teachers.map((teacher) => (
                <Chip
                  key={teacher.id}
                  label={`${teacher.name} ${String(teacher.lectures)}`}
                  active={draft.teacher.includes(teacher.id)}
                  onPress={() => {
                    setDraft({ ...draft, teacher: toggle(draft.teacher, teacher.id) });
                  }}
                />
              ))}
            </Section>

            <Section title="Subject">
              {options.subjects.map((subject) => (
                <Chip
                  key={subject.id}
                  label={subject.code}
                  active={draft.subject.includes(subject.id)}
                  onPress={() => {
                    setDraft({ ...draft, subject: toggle(draft.subject, subject.id) });
                  }}
                />
              ))}
            </Section>

            <Section title="Section">
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
            </Section>

            <Section title="Day">
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
            </Section>

            <Section title="Period">
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
            </Section>
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              gap: SPACING.md,
              padding: SPACING.lg,
              borderTopColor: theme.line,
              borderTopWidth: StyleSheet.hairlineWidth,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                label="Clear"
                onPress={() => {
                  const cleared: Filters = {
                    teacher: [],
                    subject: [],
                    section: [],
                    group: [],
                    day: [],
                    period: [],
                    q: "",
                  };
                  setDraft(cleared);
                  onApply(cleared);
                }}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Button
                label="Apply"
                variant="primary"
                onPress={() => {
                  onApply(draft);
                  onClose();
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
