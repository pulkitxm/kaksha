import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  countMergeOverlaps,
  labelForIndex,
  pluralize,
  type ResolvedDataset,
  type ResolvedSection,
} from "@kaksha/core";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { SelectField } from "../components/Select";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import {
  Button,
  Card,
  Chip,
  CountPill,
  EmptyState,
  FieldLabel,
  PressableScale,
  ScreenHeading,
  SubjectChip,
  TextField,
} from "../components/ui";
import { makeLocalId } from "../lib/local";
import { useStore } from "../lib/store";
import { RADIUS, SPACING, useTheme } from "../lib/theme";

type Draft = {
  id: string | null;
  name: string;
  electiveSubjectIds: string[];
};

type Pending = "delete" | "merge" | "relabel" | null;

export function SectionsView({ dataset }: { dataset: ResolvedDataset }) {
  const theme = useTheme();
  const store = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);

  const mergeOverlaps =
    mergeSource && mergeTarget
      ? countMergeOverlaps(dataset.entries, mergeSource, mergeTarget)
      : 0;

  const counts = useMemo(() => {
    const totals = new Map<string, { slots: number; lectures: number }>();
    for (const entry of dataset.entries) {
      const current = totals.get(entry.sectionId) ?? { slots: 0, lectures: 0 };
      current.slots += 1;
      current.lectures += entry.dayIds.length;
      totals.set(entry.sectionId, current);
    }
    return totals;
  }, [dataset.entries]);

  const nameById = useMemo(
    () => new Map(dataset.sections.map((section) => [section.id, section.name])),
    [dataset.sections],
  );

  const subjectOptions = useMemo(
    () =>
      dataset.subjects.map((subject) => ({
        id: subject.id,
        label: `${subject.code} · ${subject.name}`,
        color: subject.color,
      })),
    [dataset.subjects],
  );

  async function run(action: () => Promise<"synced" | "queued">, done: string) {
    setBusy(true);
    try {
      const result = await action();
      toast(result === "synced" ? done : `${done} offline, syncs later`, "success");
      setDraft(null);
      setPending(null);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not save", "error");
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  function open(section: ResolvedSection | null) {
    setDraft(
      section
        ? {
            id: section.id,
            name: section.name,
            electiveSubjectIds: section.electives.map((subject) => subject.id),
          }
        : {
            id: null,
            name: labelForIndex(dataset.sections.length),
            electiveSubjectIds: [],
          },
    );
  }

  function save() {
    if (!draft) return;
    const name = draft.name.trim();

    if (!draft.id) {
      void run(
        () =>
          store.mutate({
            kind: "createSection",
            localId: makeLocalId("sec", store.classId),
            input: {
              classId: dataset.classId,
              name,
              electiveSubjectIds: draft.electiveSubjectIds,
              note: null,
            },
          }),
        "Section added",
      );
      return;
    }

    const id = draft.id;
    const section = dataset.sections.find((item) => item.id === id);
    const electivesChanged =
      JSON.stringify(section?.electives.map((subject) => subject.id) ?? []) !==
      JSON.stringify(draft.electiveSubjectIds);

    void run(async () => {
      let result: "synced" | "queued" = "synced";
      if (section && section.name !== name) {
        result = await store.mutate({ kind: "renameSection", id, name });
      }
      if (electivesChanged) {
        result = await store.mutate({
          kind: "setSectionElectives",
          id,
          electiveSubjectIds: draft.electiveSubjectIds,
        });
      }
      return result;
    }, "Section saved");
  }

  const editingCount = draft?.id ? counts.get(draft.id) : undefined;

  return (
    <View>
      <ScreenHeading
        title="Sections"
        hint={`${String(dataset.sections.length)} in ${dataset.currentClass.name}`}
        action={
          <Button
            label="Add section"
            variant="primary"
            icon="add"
            onPress={() => {
              open(null);
            }}
          />
        }
      />

      <View style={{ gap: SPACING.sm }}>
        {dataset.sections.length === 0 ? (
          <EmptyState title="No sections" hint="Add one before scheduling lectures" />
        ) : null}

        {dataset.sections.map((section, index) => {
          const count = counts.get(section.id);
          return (
            <Animated.View
              key={section.id}
              entering={FadeInDown.delay(Math.min(index * 24, 240)).duration(200)}
            >
              <PressableScale
                label={`Edit section ${section.name}`}
                pressedScale={0.99}
                onPress={() => {
                  open(section);
                }}
              >
                <Card
                  style={{
                    padding: SPACING.md,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: SPACING.md,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: RADIUS.md,
                      borderColor: theme.lineStrong,
                      borderWidth: StyleSheet.hairlineWidth,
                      backgroundColor: theme.bgSubtle,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: theme.fg, fontWeight: "700", fontSize: 15 }}>
                      {section.name}
                    </Text>
                  </View>

                  <View style={{ flex: 1, gap: SPACING.xs }}>
                    <Text style={{ color: theme.fgMuted, fontSize: 12 }}>
                      {count
                        ? `${String(count.slots)} slots · ${String(count.lectures)} lectures a week`
                        : "Nothing scheduled yet"}
                    </Text>
                    {section.electives.length > 0 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: SPACING.xs,
                        }}
                      >
                        {section.electives.map((subject) => (
                          <SubjectChip
                            key={subject.id}
                            code={subject.code}
                            color={subject.color}
                            theme={theme}
                            compact
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>

                  <Ionicons name="create-outline" size={16} color={theme.fgFaint} />
                </Card>
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>

      {dataset.sections.length > 1 ? (
        <Card style={{ marginTop: SPACING.lg, gap: SPACING.md }}>
          <View>
            <Text style={{ color: theme.fg, fontSize: 15, fontWeight: "700" }}>
              Merge sections
            </Text>
            <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 2 }}>
              Move every lecture of one section into another, then drop it
            </Text>
          </View>

          <View>
            <FieldLabel text="Merge this" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
              {dataset.sections.map((section) => (
                <Chip
                  key={`src-${section.id}`}
                  label={section.name}
                  tone="danger"
                  active={section.id === mergeSource}
                  onPress={() => {
                    setMergeSource(section.id);
                    if (mergeTarget === section.id) setMergeTarget(null);
                  }}
                />
              ))}
            </View>
          </View>

          <View>
            <FieldLabel text="Into" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
              {dataset.sections
                .filter((section) => section.id !== mergeSource)
                .map((section) => (
                  <Chip
                    key={`dst-${section.id}`}
                    label={section.name}
                    active={section.id === mergeTarget}
                    onPress={() => {
                      setMergeTarget(section.id);
                    }}
                  />
                ))}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: SPACING.md }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Merge"
                variant="danger"
                icon="git-merge-outline"
                disabled={busy || !mergeSource || !mergeTarget}
                onPress={() => {
                  setPending("merge");
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Relabel A, B, C"
                icon="swap-vertical-outline"
                disabled={busy}
                onPress={() => {
                  setPending("relabel");
                }}
              />
            </View>
          </View>
        </Card>
      ) : null}

      <Sheet
        visible={draft !== null}
        title={draft?.id ? `Section ${draft.name}` : "New section"}
        subtitle={
          editingCount
            ? `${String(editingCount.lectures)} lectures a week`
            : "Sections are the rows of the timetable"
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
                    setPending("delete");
                  }}
                />
              </View>
            ) : null}
            <View style={{ flex: 2 }}>
              <Button
                label={draft?.id ? "Save changes" : "Add section"}
                variant="primary"
                busy={busy}
                disabled={(draft?.name ?? "").trim().length === 0}
                onPress={save}
              />
            </View>
          </View>
        }
      >
        <View style={{ paddingHorizontal: SPACING.lg, gap: SPACING.md }}>
          <TextField
            label="Name"
            value={draft?.name ?? ""}
            placeholder="A"
            maxLength={20}
            autoCapitalize="characters"
            onChangeText={(name) => {
              setDraft((current) => (current ? { ...current, name } : current));
            }}
          />
          <SelectField
            label="Electives"
            placeholder="No electives"
            multi
            options={subjectOptions}
            selected={draft?.electiveSubjectIds ?? []}
            onChange={(electiveSubjectIds) => {
              setDraft((current) =>
                current ? { ...current, electiveSubjectIds } : current,
              );
            }}
          />
          {draft?.id ? (
            <CountPill label={`Section id ${draft.id}`} />
          ) : (
            <Text style={{ color: theme.fgMuted, fontSize: 12 }}>
              Electives show under the section name in the timetable.
            </Text>
          )}
        </View>
      </Sheet>

      <ConfirmDialog
        visible={pending === "delete"}
        title={`Delete section ${draft?.name ?? ""}?`}
        message={
          editingCount
            ? `Its ${String(editingCount.slots)} slots are deleted too and the rest are relabelled.`
            : "The remaining sections are relabelled."
        }
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!draft?.id) return;
          void run(
            () => store.mutate({ kind: "deleteSection", id: draft.id ?? "" }),
            "Section deleted",
          );
        }}
        onCancel={() => {
          setPending(null);
        }}
      />

      <ConfirmDialog
        visible={pending === "merge"}
        title={`Merge ${nameById.get(mergeSource ?? "") ?? "?"} into ${
          nameById.get(mergeTarget ?? "") ?? "?"
        }?`}
        message={
          mergeOverlaps > 0
            ? `Both sections teach at the same time, so ${pluralize(mergeOverlaps, "slot")} would end up holding two lectures at once. All the lectures move over, the section is removed and the rest are relabelled. This cannot be undone.`
            : "All its lectures move over, the section is removed and the rest are relabelled. This cannot be undone."
        }
        confirmLabel="Merge"
        icon="git-merge-outline"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!mergeSource || !mergeTarget) return;
          void run(async () => {
            const result = await store.mutate({
              kind: "mergeSections",
              input: {
                classId: dataset.classId,
                sourceId: mergeSource,
                targetId: mergeTarget,
                relabel: true,
              },
            });
            setMergeSource(null);
            setMergeTarget(null);
            return result;
          }, "Sections merged");
        }}
        onCancel={() => {
          setPending(null);
        }}
      />

      <ConfirmDialog
        visible={pending === "relabel"}
        title="Relabel all sections?"
        message="Every section is renamed to A, B, C and so on in its current order."
        confirmLabel="Relabel"
        icon="swap-vertical-outline"
        busy={busy}
        onConfirm={() => {
          void run(
            () =>
              store.mutate({
                kind: "reorderSections",
                input: {
                  classId: dataset.classId,
                  orderedIds: dataset.sections.map((section) => section.id),
                  relabel: true,
                },
              }),
            "Sections relabelled",
          );
        }}
        onCancel={() => {
          setPending(null);
        }}
      />
    </View>
  );
}
