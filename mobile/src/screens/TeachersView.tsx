import { useMemo, useState } from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  pluralize,
  type DerivedView,
  type ResolvedDataset,
  type Teacher,
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
  PressableScale,
  ScreenHeading,
  SubjectChip,
  TextField,
  ToggleRow,
} from "../components/ui";
import { makeLocalId } from "../lib/local";
import { useStore } from "../lib/store";
import { RADIUS, SPACING, SPRING, useTheme } from "../lib/theme";

type Draft = {
  id: string | null;
  name: string;
  shortName: string;
  department: string;
  active: boolean;
};

const EMPTY_DRAFT: Draft = {
  id: null,
  name: "",
  shortName: "",
  department: "",
  active: true,
};

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part.slice(0, 1).toUpperCase()).join("") || "?";
}

function LoadBar({ fraction }: { fraction: number }) {
  const theme = useTheme();
  const width = useDerivedValue(() => withSpring(Math.min(fraction, 1), SPRING));
  const barStyle = useAnimatedStyle(() => ({
    width: `${String(width.get() * 100)}%` as DimensionValue,
  }));

  return (
    <View
      style={{
        height: 4,
        backgroundColor: theme.bgSubtle,
        borderRadius: RADIUS.pill,
        marginTop: 6,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          barStyle,
          { height: "100%", borderRadius: RADIUS.pill, backgroundColor: theme.accent },
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
  const store = useStore();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const load = useMemo(
    () => new Map(derived.teacherLoad.map((row) => [row.teacherId, row])),
    [derived.teacherLoad],
  );

  const peak = derived.teacherLoad.reduce((max, row) => Math.max(max, row.lectures), 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dataset.teachers.filter(
      (teacher) =>
        !needle ||
        teacher.name.toLowerCase().includes(needle) ||
        (teacher.department ?? "").toLowerCase().includes(needle),
    );
  }, [dataset.teachers, query]);

  const editing = draft?.id
    ? dataset.teachers.find((teacher) => teacher.id === draft.id)
    : null;
  const editingLectures = editing ? (load.get(editing.id)?.lectures ?? 0) : 0;

  function open(teacher: Teacher | null) {
    setDraft(
      teacher
        ? {
            id: teacher.id,
            name: teacher.name,
            shortName: teacher.shortName,
            department: teacher.department ?? "",
            active: teacher.active,
          }
        : EMPTY_DRAFT,
    );
  }

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
    const department = draft.department.trim();
    const payload = {
      name: draft.name.trim(),
      shortName: draft.shortName.trim() || draft.name.trim(),
      department: department.length > 0 ? department : null,
      active: draft.active,
    };

    void run(
      () =>
        draft.id
          ? store.mutate({ kind: "updateTeacher", id: draft.id, patch: payload })
          : store.mutate({
              kind: "createTeacher",
              localId: makeLocalId("tch", store.classId),
              input: payload,
            }),
      draft.id ? "Teacher saved" : "Teacher added",
    );
  }

  return (
    <View>
      <ScreenHeading
        title="Teachers"
        hint={`${String(dataset.teachers.length)} on the staff list`}
        action={
          <Button
            label="Add teacher"
            variant="primary"
            icon="add"
            onPress={() => {
              open(null);
            }}
          />
        }
      />

      <SearchBar value={query} placeholder="Search teachers" onChange={setQuery} />

      <View style={{ gap: SPACING.sm, marginTop: SPACING.md }}>
        {visible.length === 0 ? (
          <EmptyState title="No teachers" hint="Add one to start assigning lectures" />
        ) : null}

        {visible.map((teacher, index) => {
          const row = load.get(teacher.id);
          return (
            <Animated.View
              key={teacher.id}
              entering={FadeInDown.delay(Math.min(index * 24, 240)).duration(200)}
            >
              <PressableScale
                label={`Edit ${teacher.name}`}
                pressedScale={0.99}
                onPress={() => {
                  open(teacher);
                }}
              >
                <Card
                  style={{ padding: SPACING.md, flexDirection: "row", gap: SPACING.md }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: RADIUS.pill,
                      backgroundColor: `${theme.accent}1f`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{ color: theme.accent, fontWeight: "700", fontSize: 13 }}
                    >
                      {initials(teacher.name)}
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
                      <Text
                        style={{ color: theme.fg, fontWeight: "700", fontSize: 15 }}
                        numberOfLines={1}
                      >
                        {teacher.name}
                      </Text>
                      {teacher.active ? null : <CountPill label="inactive" />}
                    </View>
                    <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 1 }}>
                      {teacher.department ?? "No department"}
                      {row ? ` · ${pluralize(row.slots, "slot")}` : ""}
                    </Text>
                    {row ? <LoadBar fraction={row.lectures / (peak || 1)} /> : null}
                    {row && row.subjects.length > 0 ? (
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
                    ) : null}
                  </View>

                  <View style={{ alignItems: "flex-end", gap: SPACING.xs }}>
                    <Text
                      style={{
                        color: theme.fg,
                        fontSize: 16,
                        fontWeight: "700",
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {row?.lectures ?? 0}
                    </Text>
                    <Ionicons name="create-outline" size={16} color={theme.fgFaint} />
                  </View>
                </Card>
              </PressableScale>
            </Animated.View>
          );
        })}
        <View style={{ height: StyleSheet.hairlineWidth }} />
      </View>

      <Sheet
        visible={draft !== null}
        title={draft?.id ? "Edit teacher" : "New teacher"}
        subtitle={
          draft?.id
            ? `${String(editingLectures)} lectures a week`
            : "Staff are shared across every class"
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
                label={draft?.id ? "Save changes" : "Add teacher"}
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
            label="Full name"
            value={draft?.name ?? ""}
            placeholder="Anoop Kumar"
            maxLength={80}
            autoCapitalize="words"
            onChangeText={(name) => {
              setDraft((current) => (current ? { ...current, name } : current));
            }}
          />
          <TextField
            label="Short name"
            value={draft?.shortName ?? ""}
            placeholder="Anoop K."
            maxLength={80}
            autoCapitalize="words"
            onChangeText={(shortName) => {
              setDraft((current) => (current ? { ...current, shortName } : current));
            }}
          />
          <TextField
            label="Department"
            value={draft?.department ?? ""}
            placeholder="Languages"
            maxLength={80}
            autoCapitalize="words"
            onChangeText={(department) => {
              setDraft((current) => (current ? { ...current, department } : current));
            }}
          />
          <ToggleRow
            label="On the roster"
            hint="Inactive staff stay on record but read as unavailable"
            value={draft?.active ?? true}
            onChange={(active) => {
              setDraft((current) => (current ? { ...current, active } : current));
            }}
          />
        </View>
      </Sheet>

      <ConfirmDialog
        visible={confirmingDelete}
        title={`Delete ${editing?.name ?? "this teacher"}?`}
        message={
          editingLectures > 0
            ? `${String(editingLectures)} lectures are assigned to them and will be left without a teacher.`
            : "They are not teaching anything right now."
        }
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={() => {
          if (!draft?.id) return;
          void run(
            () =>
              store.mutate({
                kind: "deleteTeacher",
                id: draft.id ?? "",
                force: editingLectures > 0,
              }),
            "Teacher deleted",
          );
        }}
        onCancel={() => {
          setConfirmingDelete(false);
        }}
      />
    </View>
  );
}
