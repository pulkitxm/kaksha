import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  COLOR_TOKENS,
  subjectPaint,
  swatch,
  type ColorToken,
  type ResolvedDataset,
  type Subject,
} from "@kaksha/core";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { SearchBar } from "../components/SearchBar";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import {
  Button,
  Card,
  CountPill,
  EmptyState,
  FieldLabel,
  PressableScale,
  ScreenHeading,
  TextField,
  ToggleRow,
} from "../components/ui";
import { makeLocalId } from "../lib/local";
import { useStore } from "../lib/store";
import { RADIUS, SPACING, useTheme } from "../lib/theme";

type Draft = {
  id: string | null;
  code: string;
  name: string;
  group: string;
  color: ColorToken;
  inClass: boolean;
};

function draftFor(subject: Subject, inClass: boolean): Draft {
  return {
    id: subject.id,
    code: subject.code,
    name: subject.name,
    group: subject.group,
    color: subject.color,
    inClass,
  };
}

export function SubjectsView({ dataset }: { dataset: ResolvedDataset }) {
  const theme = useTheme();
  const store = useStore();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const classSubjectIds = useMemo(
    () => new Set(dataset.currentClass.subjectIds),
    [dataset.currentClass.subjectIds],
  );

  const lectures = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of dataset.entries) {
      for (const assignment of entry.assignments) {
        counts.set(
          assignment.subject.id,
          (counts.get(assignment.subject.id) ?? 0) + entry.dayIds.length,
        );
      }
    }
    return counts;
  }, [dataset.entries]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dataset.subjects
      .filter(
        (subject) =>
          !needle ||
          subject.code.toLowerCase().includes(needle) ||
          subject.name.toLowerCase().includes(needle) ||
          subject.group.toLowerCase().includes(needle),
      )
      .sort(
        (a, b) =>
          Number(classSubjectIds.has(b.id)) - Number(classSubjectIds.has(a.id)) ||
          a.code.localeCompare(b.code),
      );
  }, [classSubjectIds, dataset.subjects, query]);

  const editingLectures = draft?.id ? (lectures.get(draft.id) ?? 0) : 0;

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

  function membershipFor(subjectId: string, inClass: boolean): string[] {
    const current = dataset.currentClass.subjectIds.filter((id) => id !== subjectId);
    return inClass ? [...current, subjectId] : current;
  }

  function toggleMembership(subject: Subject) {
    const inClass = classSubjectIds.has(subject.id);
    void run(
      () =>
        store.mutate({
          kind: "setClassSubjects",
          classId: dataset.classId,
          subjectIds: membershipFor(subject.id, !inClass),
        }),
      inClass ? "Removed from this class" : "Added to this class",
    );
  }

  function save() {
    if (!draft) return;
    const payload = {
      code: draft.code.trim(),
      name: draft.name.trim() || draft.code.trim(),
      group: draft.group.trim() || "core",
      color: draft.color,
    };

    if (!draft.id) {
      void run(
        () =>
          store.mutate({
            kind: "createSubject",
            localId: makeLocalId("sub", store.classId),
            input: {
              ...payload,
              classIds: draft.inClass ? [dataset.classId] : [],
            },
          }),
        "Subject added",
      );
      return;
    }

    const id = draft.id;
    const wasInClass = classSubjectIds.has(id);

    void run(async () => {
      const result = await store.mutate({ kind: "updateSubject", id, patch: payload });
      if (draft.inClass !== wasInClass) {
        await store.mutate({
          kind: "setClassSubjects",
          classId: dataset.classId,
          subjectIds: membershipFor(id, draft.inClass),
        });
      }
      return result;
    }, "Subject saved");
  }

  return (
    <View>
      <ScreenHeading
        title="Subjects"
        hint={`${String(classSubjectIds.size)} in ${dataset.currentClass.name}, ${String(
          dataset.subjects.length,
        )} in the catalogue`}
        action={
          <Button
            label="Add subject"
            variant="primary"
            icon="add"
            onPress={() => {
              setDraft({
                id: null,
                code: "",
                name: "",
                group: "core",
                color: "blue",
                inClass: true,
              });
            }}
          />
        }
      />

      <SearchBar value={query} placeholder="Search subjects" onChange={setQuery} />

      <View style={{ gap: SPACING.sm, marginTop: SPACING.md }}>
        {visible.length === 0 ? (
          <EmptyState title="No subjects" hint="Add one to build the timetable" />
        ) : null}

        {visible.map((subject, index) => {
          const paint = subjectPaint(subject.color, theme);
          const inClass = classSubjectIds.has(subject.id);
          const count = lectures.get(subject.id) ?? 0;

          return (
            <Animated.View
              key={subject.id}
              entering={FadeInDown.delay(Math.min(index * 24, 240)).duration(200)}
            >
              <PressableScale
                label={`Edit ${subject.name}`}
                pressedScale={0.99}
                onPress={() => {
                  setDraft(draftFor(subject, inClass));
                }}
              >
                <Card
                  style={{
                    padding: SPACING.md,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.md,
                    opacity: inClass ? 1 : 0.72,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: RADIUS.md,
                      backgroundColor: paint.background,
                      borderColor: paint.border,
                      borderWidth: StyleSheet.hairlineWidth,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="book" size={17} color={paint.accent} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ color: theme.fg, fontWeight: "700", fontSize: 15 }}
                      numberOfLines={1}
                    >
                      {subject.code}
                    </Text>
                    <Text
                      style={{ color: theme.fgMuted, fontSize: 12, marginTop: 1 }}
                      numberOfLines={1}
                    >
                      {subject.name} · {subject.group}
                    </Text>
                  </View>

                  {count > 0 ? <CountPill label={`${String(count)} lectures`} /> : null}

                  <PressableScale
                    label={inClass ? "Remove from this class" : "Add to this class"}
                    selected={inClass}
                    pressedScale={0.88}
                    onPress={() => {
                      toggleMembership(subject);
                    }}
                    style={{ padding: SPACING.xs }}
                  >
                    <Ionicons
                      name={inClass ? "checkbox" : "square-outline"}
                      size={21}
                      color={inClass ? theme.accent : theme.lineStrong}
                    />
                  </PressableScale>
                </Card>
              </PressableScale>
            </Animated.View>
          );
        })}
        <View style={{ height: StyleSheet.hairlineWidth }} />
      </View>

      <Sheet
        visible={draft !== null}
        title={draft?.id ? "Edit subject" : "New subject"}
        subtitle={
          draft?.id
            ? `${String(editingLectures)} lectures in this class`
            : "Subjects are shared, tick the box to use it here"
        }
        onClose={() => {
          setDraft(null);
        }}
        footer={
          <View style={{ flexDirection: "row", gap: SPACING.md }}>
            {draft?.id ? (
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
                label={draft?.id ? "Save changes" : "Add subject"}
                variant="primary"
                busy={busy}
                disabled={(draft?.code ?? "").trim().length === 0}
                onPress={save}
              />
            </View>
          </View>
        }
      >
        <View style={{ paddingHorizontal: SPACING.lg, gap: SPACING.md }}>
          <TextField
            label="Code"
            value={draft?.code ?? ""}
            placeholder="Hindi"
            maxLength={40}
            autoCapitalize="words"
            onChangeText={(code) => {
              setDraft((current) => (current ? { ...current, code } : current));
            }}
          />
          <TextField
            label="Full name"
            value={draft?.name ?? ""}
            placeholder="Hindi language"
            maxLength={80}
            autoCapitalize="sentences"
            onChangeText={(name) => {
              setDraft((current) => (current ? { ...current, name } : current));
            }}
          />
          <TextField
            label="Group"
            value={draft?.group ?? ""}
            placeholder="core, elective, activity"
            maxLength={40}
            autoCapitalize="none"
            onChangeText={(group) => {
              setDraft((current) => (current ? { ...current, group } : current));
            }}
          />

          <View>
            <FieldLabel text="Colour" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
              {COLOR_TOKENS.map((token) => {
                const tone = swatch(token);
                const active = draft?.color === token;
                return (
                  <PressableScale
                    key={token}
                    label={token}
                    selected={active}
                    onPress={() => {
                      setDraft((current) =>
                        current ? { ...current, color: token } : current,
                      );
                    }}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: RADIUS.pill,
                      backgroundColor: `${tone.base}2e`,
                      borderColor: active ? tone.base : "transparent",
                      borderWidth: 2,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: RADIUS.pill,
                        backgroundColor: tone.base,
                      }}
                    />
                  </PressableScale>
                );
              })}
            </View>
          </View>

          <ToggleRow
            label={`Taught in ${dataset.currentClass.shortName}`}
            hint="Only these subjects show up first when you edit a lecture"
            value={draft?.inClass ?? false}
            onChange={(inClass) => {
              setDraft((current) => (current ? { ...current, inClass } : current));
            }}
          />
        </View>
      </Sheet>

      <ConfirmDialog
        visible={confirmingDelete}
        title="Delete this subject?"
        message={
          editingLectures > 0
            ? "It is still taught in this class. Remove those lectures first."
            : "It disappears from the catalogue for every class."
        }
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!draft?.id) return;
          void run(
            () => store.mutate({ kind: "deleteSubject", id: draft.id ?? "" }),
            "Subject deleted",
          );
        }}
        onCancel={() => {
          setConfirmingDelete(false);
        }}
      />
    </View>
  );
}
