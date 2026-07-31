import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ResolvedDataset, ResolvedEntry } from "@kaksha/core";

import { useStore } from "../lib/store";
import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { Banner, Button, SubjectChip } from "./ui";

type Props = {
  entry: ResolvedEntry | null;
  dataset: ResolvedDataset;
  onClose: () => void;
  onSaved: () => void;
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function EntryEditor({ entry, dataset, onClose, onSaved }: Props) {
  const theme = useTheme();
  const store = useStore();
  const [sectionId, setSectionId] = useState(entry?.sectionId ?? "");
  const [periodId, setPeriodId] = useState(entry?.periodId ?? 0);
  const [dayIds, setDayIds] = useState<number[]>(entry?.dayIds ?? []);
  const [assignments, setAssignments] = useState(
    entry?.assignments.map((item) => ({
      subjectId: item.subject.id,
      teacherId: item.teacher?.id ?? null,
    })) ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState(0);

  if (!entry) return null;

  const target = entry;

  async function save() {
    if (dayIds.length === 0) {
      setError("Pick at least one day");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await store.mutate({
        kind: "updateEntry",
        id: target.id,
        patch: { sectionId, periodId, dayIds, assignments },
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await store.mutate({ kind: "deleteEntry", id: target.id });
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  function Row({ title, children }: { title: string; children: React.ReactNode }) {
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

  const current = assignments[editingIndex];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#00000099", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: RADIUS.lg,
            borderTopRightRadius: RADIUS.lg,
            maxHeight: "92%",
            paddingTop: SPACING.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: SPACING.lg,
              paddingBottom: SPACING.md,
            }}
          >
            <Text style={{ color: theme.fg, fontSize: 17, fontWeight: "700" }}>
              Edit lecture
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
              <Text style={{ color: theme.fgMuted, fontSize: 15 }}>Close</Text>
            </Pressable>
          </View>

          <ScrollView style={{ paddingHorizontal: SPACING.lg }}>
            {error ? (
              <View style={{ marginBottom: SPACING.md }}>
                <Banner text={error} tone="error" />
              </View>
            ) : null}

            <Row title="Section">
              {dataset.sections.map((section) => (
                <Chip
                  key={section.id}
                  label={section.name}
                  active={section.id === sectionId}
                  onPress={() => {
                    setSectionId(section.id);
                  }}
                />
              ))}
            </Row>

            <Row title="Period">
              {dataset.periods.map((period) => (
                <Chip
                  key={period.id}
                  label={period.label}
                  active={period.id === periodId}
                  onPress={() => {
                    setPeriodId(period.id);
                  }}
                />
              ))}
            </Row>

            <Row title="Days">
              {dataset.days.map((day) => (
                <Chip
                  key={day.id}
                  label={day.short}
                  active={dayIds.includes(day.id)}
                  onPress={() => {
                    setDayIds(toggle(dayIds, day.id));
                  }}
                />
              ))}
            </Row>

            {assignments.length > 1 ? (
              <Row title="Editing slot">
                {assignments.map((item, index) => {
                  const subject = dataset.subjects.find((s) => s.id === item.subjectId);
                  return (
                    <Chip
                      key={`${item.subjectId}-${String(index)}`}
                      label={subject?.code ?? item.subjectId}
                      active={index === editingIndex}
                      onPress={() => {
                        setEditingIndex(index);
                      }}
                    />
                  );
                })}
              </Row>
            ) : null}

            <Row title="Subject">
              {dataset.subjects.map((subject) => (
                <Chip
                  key={subject.id}
                  label={subject.code}
                  active={current?.subjectId === subject.id}
                  onPress={() => {
                    setAssignments(
                      assignments.map((item, index) =>
                        index === editingIndex
                          ? { ...item, subjectId: subject.id }
                          : item,
                      ),
                    );
                  }}
                />
              ))}
            </Row>

            <Row title="Teacher">
              <Chip
                label="Unassigned"
                active={current?.teacherId === null}
                onPress={() => {
                  setAssignments(
                    assignments.map((item, index) =>
                      index === editingIndex ? { ...item, teacherId: null } : item,
                    ),
                  );
                }}
              />
              {dataset.teachers.map((teacher) => (
                <Chip
                  key={teacher.id}
                  label={teacher.name}
                  active={current?.teacherId === teacher.id}
                  onPress={() => {
                    setAssignments(
                      assignments.map((item, index) =>
                        index === editingIndex
                          ? { ...item, teacherId: teacher.id }
                          : item,
                      ),
                    );
                  }}
                />
              ))}
            </Row>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>
              {assignments.map((item, index) => {
                const subject = dataset.subjects.find((s) => s.id === item.subjectId);
                return (
                  <SubjectChip
                    key={`preview-${String(index)}`}
                    code={subject?.code ?? item.subjectId}
                    color={subject?.color ?? "slate"}
                    theme={theme}
                  />
                );
              })}
            </View>
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
                label="Delete"
                variant="danger"
                disabled={busy}
                onPress={() => {
                  void remove();
                }}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Button
                label={busy ? "Saving" : "Save"}
                variant="primary"
                disabled={busy}
                onPress={() => {
                  void save();
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
