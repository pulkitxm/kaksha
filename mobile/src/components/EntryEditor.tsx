import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import type { ResolvedDataset, ResolvedEntry } from "@kaksha/core";

import { makeLocalEntryId } from "../lib/local";
import { useStore } from "../lib/store";
import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { ConfirmDialog } from "./ConfirmDialog";
import { SelectField } from "./Select";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";
import { Button, Chip, IconButton } from "./ui";

export type EditorTarget =
  | { mode: "edit"; entry: ResolvedEntry }
  | { mode: "create"; sectionId: string; periodId: number };

type Props = {
  target: EditorTarget | null;
  dataset: ResolvedDataset;
  onClose: () => void;
};

type DraftAssignment = { subjectId: string; teacherId: string | null };

type Draft = {
  sectionId: string;
  periodId: number;
  dayIds: number[];
  assignments: DraftAssignment[];
  note: string;
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function draftFrom(target: EditorTarget): Draft {
  if (target.mode === "edit") {
    return {
      sectionId: target.entry.sectionId,
      periodId: target.entry.periodId,
      dayIds: target.entry.dayIds,
      assignments: target.entry.assignments.map((item) => ({
        subjectId: item.subject.id,
        teacherId: item.teacher?.id ?? null,
      })),
      note: target.entry.note ?? "",
    };
  }
  return {
    sectionId: target.sectionId,
    periodId: target.periodId,
    dayIds: [],
    assignments: [{ subjectId: "", teacherId: null }],
    note: "",
  };
}

function Label({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.fgFaint,
        fontSize: 11,
        letterSpacing: 0.8,
        marginBottom: SPACING.sm,
      }}
    >
      {text.toUpperCase()}
    </Text>
  );
}

const UNASSIGNED = "unassigned";

export function EntryEditor({ target, dataset, onClose }: Props) {
  const theme = useTheme();
  const store = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setDraft(target ? draftFrom(target) : null);
    setOpen(target !== null);
    setConfirmingDelete(false);
  }, [target]);

  const subjectOptions = useMemo(
    () =>
      dataset.subjects.map((subject) => ({
        id: subject.id,
        label: `${subject.code} · ${subject.name}`,
        color: subject.color,
      })),
    [dataset.subjects],
  );

  const teacherOptions = useMemo(
    () => [
      { id: UNASSIGNED, label: "Unassigned", sublabel: "No teacher yet" },
      ...dataset.teachers.map((teacher) => ({
        id: teacher.id,
        label: teacher.name,
        sublabel: teacher.department ?? undefined,
      })),
    ],
    [dataset.teachers],
  );

  if (!target || !draft) return null;

  const valid =
    draft.sectionId.length > 0 &&
    draft.dayIds.length > 0 &&
    draft.assignments.length > 0 &&
    draft.assignments.every((item) => item.subjectId.length > 0);

  function update(partial: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
  }

  function updateAssignment(index: number, partial: Partial<DraftAssignment>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            assignments: current.assignments.map((item, at) =>
              at === index ? { ...item, ...partial } : item,
            ),
          }
        : current,
    );
  }

  async function save() {
    if (!draft || !valid) return;
    setBusy(true);
    try {
      const payload = {
        sectionId: draft.sectionId,
        periodId: draft.periodId,
        dayIds: draft.dayIds,
        assignments: draft.assignments,
        note: draft.note.trim().length > 0 ? draft.note.trim() : null,
      };
      const result =
        target?.mode === "edit"
          ? await store.mutate({
              kind: "updateEntry",
              id: target.entry.id,
              patch: payload,
            })
          : await store.mutate({
              kind: "createEntry",
              localId: makeLocalEntryId(store.classId),
              input: { classId: store.classId, ...payload },
            });
      toast(
        result === "synced" ? "Lecture saved" : "Saved offline, syncs later",
        "success",
      );
      setOpen(false);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not save", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (target?.mode !== "edit") return;
    setBusy(true);
    try {
      const result = await store.mutate({ kind: "deleteEntry", id: target.entry.id });
      toast(
        result === "synced" ? "Lecture deleted" : "Deleted offline, syncs later",
        "success",
      );
      setConfirmingDelete(false);
      setOpen(false);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not delete", "error");
      setConfirmingDelete(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet
        visible={open}
        title={target.mode === "edit" ? "Edit lecture" : "New lecture"}
        subtitle={
          target.mode === "edit"
            ? "Changes apply instantly and sync to the server"
            : "Fill in the slot to add it to the timetable"
        }
        onClose={() => {
          setOpen(false);
        }}
        onDismissed={onClose}
        footer={
          <View style={{ flexDirection: "row", gap: SPACING.md }}>
            {target.mode === "edit" ? (
              <View style={{ flex: 1 }}>
                <Button
                  label="Delete"
                  variant="danger"
                  icon="trash-outline"
                  disabled={busy}
                  onPress={() => {
                    setConfirmingDelete(true);
                  }}
                />
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              <Button
                label={target.mode === "edit" ? "Save changes" : "Add lecture"}
                variant="primary"
                busy={busy}
                disabled={!valid}
                onPress={() => {
                  void save();
                }}
              />
            </View>
          </View>
        }
      >
        <ScrollView
          style={{ paddingHorizontal: SPACING.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginBottom: SPACING.lg }}>
            <Label text="Section" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
              {dataset.sections.map((section) => (
                <Chip
                  key={section.id}
                  label={section.name}
                  active={section.id === draft.sectionId}
                  onPress={() => {
                    update({ sectionId: section.id });
                  }}
                />
              ))}
            </View>
          </View>

          <View style={{ marginBottom: SPACING.lg }}>
            <Label text="Period" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
              {dataset.periods.map((period) => (
                <Chip
                  key={period.id}
                  label={period.label}
                  active={period.id === draft.periodId}
                  onPress={() => {
                    update({ periodId: period.id });
                  }}
                />
              ))}
            </View>
          </View>

          <View style={{ marginBottom: SPACING.lg }}>
            <Label text="Days" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
              {dataset.days.map((day) => (
                <Chip
                  key={day.id}
                  label={day.short}
                  active={draft.dayIds.includes(day.id)}
                  onPress={() => {
                    update({ dayIds: toggle(draft.dayIds, day.id) });
                  }}
                />
              ))}
            </View>
          </View>

          <Label text="Subjects and teachers" />
          {draft.assignments.map((assignment, index) => (
            <Animated.View
              key={index}
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(140)}
              layout={LinearTransition.springify().damping(22).stiffness(300)}
              style={{
                backgroundColor: theme.bgSubtle,
                borderColor: theme.line,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: RADIUS.lg,
                padding: SPACING.md,
                marginBottom: SPACING.sm,
                gap: SPACING.md,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: theme.fgMuted, fontSize: 12, fontWeight: "600" }}>
                  Slot {String(index + 1)}
                </Text>
                {draft.assignments.length > 1 ? (
                  <IconButton
                    icon="close"
                    label={`Remove slot ${String(index + 1)}`}
                    size={15}
                    onPress={() => {
                      update({
                        assignments: draft.assignments.filter((_, at) => at !== index),
                      });
                    }}
                  />
                ) : null}
              </View>
              <SelectField
                label="Subject"
                placeholder="Pick a subject"
                options={subjectOptions}
                selected={assignment.subjectId ? [assignment.subjectId] : []}
                onChange={(ids) => {
                  updateAssignment(index, { subjectId: ids[0] ?? "" });
                }}
              />
              <SelectField
                label="Teacher"
                placeholder="Pick a teacher"
                options={teacherOptions}
                selected={[assignment.teacherId ?? UNASSIGNED]}
                onChange={(ids) => {
                  const id = ids[0];
                  updateAssignment(index, {
                    teacherId: !id || id === UNASSIGNED ? null : id,
                  });
                }}
              />
            </Animated.View>
          ))}

          {draft.assignments.length < 6 ? (
            <View style={{ marginBottom: SPACING.lg }}>
              <Button
                label="Add another subject"
                icon="add"
                onPress={() => {
                  update({
                    assignments: [
                      ...draft.assignments,
                      { subjectId: "", teacherId: null },
                    ],
                  });
                }}
              />
            </View>
          ) : null}

          <View style={{ marginBottom: SPACING.xl }}>
            <Label text="Note" />
            <TextInput
              value={draft.note}
              onChangeText={(text) => {
                update({ note: text });
              }}
              placeholder="Optional note for this slot"
              placeholderTextColor={theme.fgFaint}
              maxLength={200}
              style={{
                borderColor: theme.lineStrong,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: RADIUS.md,
                color: theme.fg,
                paddingHorizontal: SPACING.md,
                minHeight: 44,
              }}
            />
          </View>
        </ScrollView>
      </Sheet>

      <ConfirmDialog
        visible={confirmingDelete}
        title="Delete this lecture?"
        message="It disappears from every day it is scheduled on. This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={() => {
          void remove();
        }}
        onCancel={() => {
          setConfirmingDelete(false);
        }}
      />
    </>
  );
}
