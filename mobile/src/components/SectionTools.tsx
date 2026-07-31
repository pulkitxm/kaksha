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
import type { ResolvedDataset } from "@kaksha/core";

import { useStore } from "../lib/store";
import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { Banner, Button } from "./ui";

type Props = {
  visible: boolean;
  dataset: ResolvedDataset;
  onClose: () => void;
  onSaved: () => void;
};

export function SectionTools({ visible, dataset, onClose, onSaved }: Props) {
  const theme = useTheme();
  const store = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  function Chip({
    label,
    active,
    onPress,
    tone,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
    tone?: string;
  }) {
    const background = active ? (tone ?? theme.accent) : theme.panel;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        style={{
          backgroundColor: background,
          borderColor: active ? background : theme.lineStrong,
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
        <Text style={{ color: active ? "#ffffff" : theme.fg, fontSize: 13 }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function Heading({ text, hint }: { text: string; hint?: string }) {
    return (
      <View style={{ marginBottom: SPACING.sm, marginTop: SPACING.lg }}>
        <Text style={{ color: theme.fg, fontSize: 15, fontWeight: "700" }}>{text}</Text>
        {hint ? (
          <Text style={{ color: theme.fgMuted, fontSize: 12, marginTop: 2 }}>{hint}</Text>
        ) : null}
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
            maxHeight: "92%",
            paddingTop: SPACING.lg,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: SPACING.lg,
              paddingBottom: SPACING.sm,
            }}
          >
            <Text style={{ color: theme.fg, fontSize: 17, fontWeight: "700" }}>
              Sections
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
              <Text style={{ color: theme.fgMuted, fontSize: 15 }}>Close</Text>
            </Pressable>
          </View>

          <ScrollView style={{ paddingHorizontal: SPACING.lg }}>
            {error ? <Banner text={error} tone="error" /> : null}

            <Heading text="Rename" hint="Pick a section, then type its new name" />
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
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
                style={{ flexDirection: "row", gap: SPACING.sm, alignItems: "center" }}
              >
                <TextInput
                  value={renameValue}
                  onChangeText={setRenameValue}
                  placeholder="New name"
                  placeholderTextColor={theme.fgFaint}
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
                      await store.mutate({
                        kind: "renameSection",
                        id: renameId,
                        name: renameValue.trim(),
                      });
                      setRenameId(null);
                    });
                  }}
                />
              </View>
            ) : null}

            <Heading
              text="Merge"
              hint="The source folds into the target and the rest are relabelled"
            />
            <Text
              style={{ color: theme.fgFaint, fontSize: 11, marginBottom: SPACING.xs }}
            >
              MERGE THIS
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {dataset.sections.map((section) => (
                <Chip
                  key={`src-${section.id}`}
                  label={section.name}
                  active={section.id === mergeSource}
                  tone={theme.danger}
                  onPress={() => {
                    setMergeSource(section.id);
                  }}
                />
              ))}
            </View>
            <Text
              style={{ color: theme.fgFaint, fontSize: 11, marginBottom: SPACING.xs }}
            >
              INTO
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
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
            <Button
              label="Merge sections"
              variant="danger"
              disabled={busy || !mergeSource || !mergeTarget}
              onPress={() => {
                if (!mergeSource || !mergeTarget) return;
                void run(async () => {
                  await store.mutate({
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
                });
              }}
            />

            <Heading
              text="Relabel"
              hint="Renumber every section as A, B, C in current order"
            />
            <View style={{ marginBottom: SPACING.xl }}>
              <Button
                label="Relabel sequentially"
                disabled={busy}
                onPress={() => {
                  void run(() =>
                    store.mutate({
                      kind: "reorderSections",
                      input: {
                        classId: dataset.classId,
                        orderedIds: dataset.sections.map((section) => section.id),
                        relabel: true,
                      },
                    }),
                  );
                }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
