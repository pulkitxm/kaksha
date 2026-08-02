import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import type { Period, ResolvedDataset } from "@kaksha/core";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import {
  Button,
  Card,
  CountPill,
  FieldLabel,
  IconButton,
  PressableScale,
  ScreenHeading,
  TextField,
  ToggleRow,
} from "../components/ui";
import { useStore } from "../lib/store";
import { RADIUS, SPACING, useTheme } from "../lib/theme";

type Draft = {
  id: string;
  name: string;
  shortName: string;
  active: boolean;
  periods: Period[];
  isNew: boolean;
  editable: boolean;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function nextPeriod(periods: Period[]): Period {
  const id = periods.reduce((max, period) => Math.max(max, period.id), -1) + 1;
  const label = String(id);
  return { id, name: label, label };
}

function PeriodEditor({
  periods,
  onChange,
}: {
  periods: Period[];
  onChange: (next: Period[]) => void;
}) {
  const theme = useTheme();

  function patch(id: number, partial: Partial<Period>) {
    onChange(
      periods.map((period) => (period.id === id ? { ...period, ...partial } : period)),
    );
  }

  return (
    <View>
      <FieldLabel text={`Periods (${String(periods.length)})`} />
      <View style={{ gap: SPACING.sm }}>
        {periods.map((period) => (
          <Animated.View
            key={period.id}
            layout={LinearTransition.springify().damping(22).stiffness(300)}
            style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}
          >
            <TextInput
              value={period.label}
              onChangeText={(label) => {
                patch(period.id, { label });
              }}
              maxLength={8}
              placeholder="0"
              placeholderTextColor={theme.fgFaint}
              style={{
                width: 62,
                textAlign: "center",
                backgroundColor: theme.panel,
                borderColor: theme.lineStrong,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: RADIUS.md,
                color: theme.fg,
                minHeight: 44,
                fontWeight: "700",
              }}
            />
            <TextInput
              value={period.name}
              onChangeText={(name) => {
                patch(period.id, { name });
              }}
              maxLength={40}
              placeholder="Name"
              placeholderTextColor={theme.fgFaint}
              style={{
                flex: 1,
                backgroundColor: theme.panel,
                borderColor: theme.lineStrong,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: RADIUS.md,
                color: theme.fg,
                paddingHorizontal: SPACING.md,
                minHeight: 44,
              }}
            />
            <IconButton
              icon="close"
              label={`Remove period ${period.label}`}
              size={16}
              disabled={periods.length <= 1}
              onPress={() => {
                onChange(periods.filter((item) => item.id !== period.id));
              }}
            />
          </Animated.View>
        ))}
      </View>
      <View style={{ marginTop: SPACING.sm }}>
        <Button
          label="Add period"
          icon="add"
          onPress={() => {
            onChange([...periods, nextPeriod(periods)]);
          }}
        />
      </View>
    </View>
  );
}

export function ClassesView({ dataset }: { dataset: ResolvedDataset }) {
  const theme = useTheme();
  const store = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const sectionCount = dataset.sections.length;

  const summaries = useMemo(
    () =>
      [...dataset.classes].sort(
        (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
      ),
    [dataset.classes],
  );

  async function run(action: () => Promise<"synced" | "queued">, done: string) {
    setBusy(true);
    try {
      const result = await action();
      toast(result === "synced" ? done : `${done} offline, syncs later`, "success");
      setDraft(null);
      setConfirmingDelete(false);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not save", "error");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!draft) return;
    const payload = {
      name: draft.name.trim(),
      shortName: draft.shortName.trim() || draft.name.trim(),
      active: draft.active,
    };

    if (draft.isNew) {
      void run(
        () =>
          store.mutate({
            kind: "createClass",
            input: {
              id: slugify(draft.id),
              ...payload,
              periods: draft.periods,
              subjectIds: [],
            },
          }),
        "Class added",
      );
      return;
    }

    void run(
      () =>
        store.mutate({
          kind: "updateClass",
          id: draft.id,
          patch: draft.editable ? { ...payload, periods: draft.periods } : payload,
        }),
      "Class saved",
    );
  }

  const deleting = draft ? dataset.classes.find((item) => item.id === draft.id) : null;
  const deletingLectures =
    deleting && deleting.entryCount >= 0 ? deleting.entryCount : null;

  return (
    <View>
      <ScreenHeading
        title="Classes"
        hint="Tap a class to load its timetable"
        action={
          <Button
            label="Add class"
            variant="primary"
            icon="add"
            onPress={() => {
              setDraft({
                id: "",
                name: "",
                shortName: "",
                active: false,
                periods: [
                  { id: 1, name: "1", label: "1" },
                  { id: 2, name: "2", label: "2" },
                  { id: 3, name: "3", label: "3" },
                ],
                isNew: true,
                editable: true,
              });
            }}
          />
        }
      />

      <View style={{ gap: SPACING.sm }}>
        {summaries.map((record, index) => {
          const current = record.id === dataset.classId;
          return (
            <Animated.View
              key={record.id}
              entering={FadeInDown.delay(Math.min(index * 24, 240)).duration(200)}
            >
              <PressableScale
                label={`Load ${record.name}`}
                selected={current}
                pressedScale={0.99}
                onPress={() => {
                  if (!current) store.setClassId(record.id);
                }}
              >
                <Card
                  style={{
                    padding: SPACING.md,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.md,
                    borderColor: current ? theme.accent : theme.line,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: RADIUS.md,
                      backgroundColor: current ? theme.accent : theme.bgSubtle,
                      borderColor: theme.lineStrong,
                      borderWidth: current ? 0 : StyleSheet.hairlineWidth,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: current ? theme.accentText : theme.fg,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {record.shortName}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: SPACING.sm,
                      }}
                    >
                      <Text style={{ color: theme.fg, fontWeight: "700", fontSize: 15 }}>
                        {record.name}
                      </Text>
                      {record.active ? <CountPill label="active" /> : null}
                    </View>
                    <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 1 }}>
                      {current
                        ? `${String(sectionCount)} sections · ${String(
                            dataset.periods.length,
                          )} periods · ${String(dataset.entries.length)} slots`
                        : "Tap to load"}
                    </Text>
                  </View>

                  <IconButton
                    icon="create-outline"
                    label={`Edit ${record.name}`}
                    size={16}
                    onPress={() => {
                      setDraft({
                        id: record.id,
                        name: record.name,
                        shortName: record.shortName,
                        active: record.active,
                        periods: current ? dataset.periods : [],
                        isNew: false,
                        editable: current,
                      });
                    }}
                  />
                </Card>
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>

      <Sheet
        visible={draft !== null}
        title={draft?.isNew ? "New class" : `Edit ${draft?.name ?? ""}`}
        subtitle={
          draft?.isNew
            ? "Give it an id you can keep, it shows up in links"
            : draft?.editable
              ? "Periods can only be edited on the loaded class"
              : "Load this class to edit its periods"
        }
        onClose={() => {
          setDraft(null);
        }}
        footer={
          <View style={{ flexDirection: "row", gap: SPACING.md }}>
            {draft && !draft.isNew ? (
              <View style={{ flex: 1 }}>
                <Button
                  label="Delete"
                  variant="danger"
                  icon="trash-outline"
                  disabled={busy || dataset.classes.length <= 1}
                  onPress={() => {
                    setConfirmingDelete(true);
                  }}
                />
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              <Button
                label={draft?.isNew ? "Add class" : "Save changes"}
                variant="primary"
                busy={busy}
                disabled={
                  (draft?.name ?? "").trim().length === 0 ||
                  (draft?.isNew === true && slugify(draft.id).length === 0)
                }
                onPress={save}
              />
            </View>
          </View>
        }
      >
        <ScrollView
          style={{ paddingHorizontal: SPACING.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: SPACING.md, paddingBottom: SPACING.lg }}>
            <TextField
              label="Name"
              value={draft?.name ?? ""}
              placeholder="Class VII"
              maxLength={60}
              autoCapitalize="words"
              onChangeText={(name) => {
                setDraft((current) => (current ? { ...current, name } : current));
              }}
            />
            <TextField
              label="Short name"
              value={draft?.shortName ?? ""}
              placeholder="VII"
              maxLength={20}
              autoCapitalize="characters"
              onChangeText={(shortName) => {
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        shortName,
                        id: current.isNew ? slugify(shortName) : current.id,
                      }
                    : current,
                );
              }}
            />
            {draft?.isNew ? (
              <TextField
                label="Id"
                value={draft.id}
                placeholder="7"
                maxLength={32}
                autoCapitalize="none"
                onChangeText={(id) => {
                  setDraft((current) => (current ? { ...current, id } : current));
                }}
              />
            ) : null}
            <ToggleRow
              label="Active"
              hint="The active class loads first when the app opens"
              value={draft?.active ?? false}
              onChange={(active) => {
                setDraft((current) => (current ? { ...current, active } : current));
              }}
            />
            {draft?.editable ? (
              <PeriodEditor
                periods={draft.periods}
                onChange={(periods) => {
                  setDraft((current) => (current ? { ...current, periods } : current));
                }}
              />
            ) : null}
          </View>
        </ScrollView>
      </Sheet>

      <ConfirmDialog
        visible={confirmingDelete}
        title={`Delete ${draft?.name ?? "this class"}?`}
        message={
          deletingLectures && deletingLectures > 0
            ? `Its ${String(deletingLectures)} slots, sections and notes are deleted with it. This cannot be undone.`
            : "Its sections and notes are deleted with it. This cannot be undone."
        }
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!draft) return;
          const target = draft.id;
          void run(async () => {
            const result = await store.mutate({
              kind: "deleteClass",
              id: target,
              force: true,
            });
            if (target === dataset.classId) {
              const next = dataset.classes.find((item) => item.id !== target);
              if (next) store.setClassId(next.id);
            }
            return result;
          }, "Class deleted");
        }}
        onCancel={() => {
          setConfirmingDelete(false);
        }}
      />
    </View>
  );
}
