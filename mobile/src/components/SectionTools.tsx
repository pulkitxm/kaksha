import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { ResolvedDataset } from "@kaksha/core";

import { useStore } from "../lib/store";
import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { ConfirmDialog } from "./ConfirmDialog";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";
import { Button, Chip } from "./ui";

type Props = {
  visible: boolean;
  dataset: ResolvedDataset;
  onClose: () => void;
};

type PendingAction = { kind: "merge" } | { kind: "relabel" } | null;

function Heading({ text, hint }: { text: string; hint: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: SPACING.sm, marginTop: SPACING.lg }}>
      <Text style={{ color: theme.fg, fontSize: 15, fontWeight: "700" }}>{text}</Text>
      <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 2 }}>{hint}</Text>
    </View>
  );
}

function SmallLabel({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.fgFaint,
        fontSize: 11,
        letterSpacing: 0.8,
        marginBottom: SPACING.xs,
        marginTop: SPACING.sm,
      }}
    >
      {text}
    </Text>
  );
}

export function SectionTools({ visible, dataset, onClose }: Props) {
  const theme = useTheme();
  const store = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  useEffect(() => {
    if (visible) {
      setRenameId(null);
      setRenameValue("");
      setMergeSource(null);
      setMergeTarget(null);
      setPending(null);
    }
  }, [visible]);

  const nameById = useMemo(
    () => new Map(dataset.sections.map((section) => [section.id, section.name])),
    [dataset.sections],
  );

  async function run(action: () => Promise<"synced" | "queued">, done: string) {
    setBusy(true);
    try {
      const result = await action();
      toast(result === "synced" ? done : `${done} offline, syncs later`, "success");
      setPending(null);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Operation failed", "error");
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet
        visible={visible}
        title="Sections"
        subtitle="Rename, merge or relabel the class sections"
        onClose={onClose}
      >
        <ScrollView
          style={{ paddingHorizontal: SPACING.lg }}
          keyboardShouldPersistTaps="handled"
        >
          <Heading text="Rename" hint="Pick a section, then type its new name" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {dataset.sections.map((section) => (
              <Chip
                key={section.id}
                label={section.name}
                active={section.id === renameId}
                onPress={() => {
                  setRenameId(section.id);
                  setRenameValue(section.name);
                }}
              />
            ))}
          </View>
          {renameId ? (
            <View
              style={{
                flexDirection: "row",
                gap: SPACING.sm,
                alignItems: "center",
                marginTop: SPACING.sm,
              }}
            >
              <TextInput
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="New name"
                placeholderTextColor={theme.fgFaint}
                maxLength={20}
                style={{
                  flex: 1,
                  borderColor: theme.lineStrong,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: RADIUS.md,
                  color: theme.fg,
                  paddingHorizontal: SPACING.md,
                  minHeight: 44,
                }}
              />
              <Button
                label="Rename"
                variant="primary"
                disabled={busy || renameValue.trim().length === 0}
                onPress={() => {
                  void run(async () => {
                    const result = await store.mutate({
                      kind: "renameSection",
                      id: renameId,
                      name: renameValue.trim(),
                    });
                    setRenameId(null);
                    return result;
                  }, "Section renamed");
                }}
              />
            </View>
          ) : null}

          <Heading
            text="Merge"
            hint="Move every lecture of one section into another, then drop it"
          />
          <SmallLabel text="MERGE THIS" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            {dataset.sections.map((section) => (
              <Chip
                key={`src-${section.id}`}
                label={section.name}
                active={section.id === mergeSource}
                tone="danger"
                onPress={() => {
                  setMergeSource(section.id);
                  if (mergeTarget === section.id) setMergeTarget(null);
                }}
              />
            ))}
          </View>
          <SmallLabel text="INTO" />
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
          <View style={{ marginTop: SPACING.md }}>
            <Button
              label="Merge sections"
              variant="danger"
              icon="git-merge-outline"
              disabled={busy || !mergeSource || !mergeTarget}
              onPress={() => {
                setPending({ kind: "merge" });
              }}
            />
          </View>

          <Heading
            text="Relabel"
            hint="Renumber every section as A, B, C in current order"
          />
          <View style={{ marginBottom: SPACING.xl }}>
            <Button
              label="Relabel sequentially"
              icon="swap-vertical-outline"
              disabled={busy}
              onPress={() => {
                setPending({ kind: "relabel" });
              }}
            />
          </View>
        </ScrollView>
      </Sheet>

      <ConfirmDialog
        visible={pending?.kind === "merge"}
        title={`Merge ${nameById.get(mergeSource ?? "") ?? "?"} into ${
          nameById.get(mergeTarget ?? "") ?? "?"
        }?`}
        message="All its lectures move over, the section is removed and the rest are relabelled. This cannot be undone."
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
        visible={pending?.kind === "relabel"}
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
    </>
  );
}
