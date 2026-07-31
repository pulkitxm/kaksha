import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import {
  buildShareModel,
  subjectPaint,
  type DerivedView,
  type Filters,
  type ResolvedDataset,
} from "@kaksha/core";

import { Banner, Button } from "../components/ui";
import { RADIUS, SPACING, useTheme } from "../lib/theme";

export function ShareView({
  dataset,
  derived,
  filters,
}: {
  dataset: ResolvedDataset;
  derived: DerivedView;
  filters: Filters;
}) {
  const theme = useTheme();
  const cardRef = useRef<View>(null);
  const [teacherId, setTeacherId] = useState<string | null>(
    filters.teacher[0] ?? dataset.teachers[0]?.id ?? null,
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const scoped = teacherId
    ? {
        ...derived,
        entries: derived.entries.map((entry) => ({
          ...entry,
          matched: entry.assignments.some((a) => a.teacher?.id === teacherId),
        })),
      }
    : derived;

  const model = buildShareModel(dataset, scoped.entries, filters, teacherId);

  async function share() {
    setBusy(true);
    setStatus(null);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png" });
        setStatus("Shared");
      } else {
        setStatus(`Saved to ${uri}`);
      }
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Could not share");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: SPACING.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          {dataset.teachers.map((teacher) => {
            const active = teacher.id === teacherId;
            return (
              <Pressable
                key={teacher.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setTeacherId(teacher.id);
                }}
                style={{
                  backgroundColor: active ? theme.accent : theme.panel,
                  borderColor: active ? theme.accent : theme.lineStrong,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: RADIUS.pill,
                  paddingHorizontal: SPACING.md,
                  paddingVertical: 8,
                  minHeight: 36,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: active ? theme.accentText : theme.fg, fontSize: 13 }}
                >
                  {teacher.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        ref={cardRef}
        collapsable={false}
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.line,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: RADIUS.lg,
          padding: SPACING.lg,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottomColor: theme.line,
            borderBottomWidth: StyleSheet.hairlineWidth,
            paddingBottom: SPACING.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.fg, fontSize: 24, fontWeight: "700" }}>
              {model.title}
            </Text>
            <Text style={{ color: theme.fgMuted, fontSize: 13, marginTop: 2 }}>
              {model.subtitle}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: theme.fg, fontSize: 22, fontWeight: "700" }}>
              {model.lectures}
            </Text>
            <Text style={{ color: theme.fgFaint, fontSize: 10 }}>LECTURES / WEEK</Text>
          </View>
        </View>

        {model.rows.length === 0 ? (
          <Text
            style={{
              color: theme.fgMuted,
              textAlign: "center",
              paddingVertical: SPACING.xl,
            }}
          >
            No lectures for this selection
          </Text>
        ) : (
          <View style={{ marginTop: SPACING.sm }}>
            <View style={{ flexDirection: "row", paddingVertical: SPACING.xs }}>
              <Text style={{ width: 46, color: theme.fgFaint, fontSize: 10 }}>
                PERIOD
              </Text>
              {model.days.map((day) => (
                <Text
                  key={day.id}
                  style={{
                    flex: 1,
                    color: theme.fgFaint,
                    fontSize: 11,
                    textAlign: "center",
                  }}
                >
                  {day.short}
                </Text>
              ))}
            </View>

            {model.rows.map((row) => (
              <View
                key={row.periodId}
                style={{
                  flexDirection: "row",
                  borderTopColor: theme.line,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  paddingVertical: SPACING.xs,
                  alignItems: "center",
                }}
              >
                <View style={{ width: 46 }}>
                  <Text style={{ color: theme.fg, fontSize: 16, fontWeight: "700" }}>
                    {row.periodLabel}
                  </Text>
                  {row.periodName ? (
                    <Text style={{ color: theme.fgFaint, fontSize: 9 }}>
                      {row.periodName}
                    </Text>
                  ) : null}
                </View>
                {model.days.map((day) => {
                  const cells = row.byDay[day.id] ?? [];
                  return (
                    <View key={day.id} style={{ flex: 1, paddingHorizontal: 2, gap: 2 }}>
                      {cells.length === 0 ? (
                        <Text
                          style={{
                            color: theme.fgFaint,
                            fontSize: 11,
                            textAlign: "center",
                          }}
                        >
                          -
                        </Text>
                      ) : (
                        cells.map((cell, index) => {
                          const paint = subjectPaint(cell.color, theme);
                          return (
                            <View
                              key={`${day.id}-${String(index)}`}
                              style={{
                                backgroundColor: paint.background,
                                borderColor: paint.border,
                                borderWidth: StyleSheet.hairlineWidth,
                                borderRadius: RADIUS.sm,
                                paddingVertical: 3,
                                paddingHorizontal: 4,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  color: paint.accent,
                                  fontSize: 11,
                                  fontWeight: "600",
                                }}
                              >
                                {cell.sectionName} {cell.subjectCode}
                              </Text>
                            </View>
                          );
                        })
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <Text style={{ color: theme.fgFaint, fontSize: 10, marginTop: SPACING.md }}>
          Kaksha · {dataset.school.session}
        </Text>
      </View>

      {status ? <Banner text={status} tone="info" /> : null}

      <Button
        label={busy ? "Preparing" : "Share as image"}
        variant="primary"
        disabled={busy}
        onPress={() => {
          void share();
        }}
      />
    </View>
  );
}
