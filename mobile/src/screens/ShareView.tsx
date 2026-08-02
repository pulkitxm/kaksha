import { useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import {
  buildShareModel,
  buildTeacherShareModel,
  THEMES,
  type DerivedView,
  type Filters,
  type ResolvedDataset,
  type ShareModel,
  type SurfaceTheme,
  type Teacher,
} from "@kaksha/core";

import { SelectField } from "../components/Select";
import { useToast } from "../components/Toast";
import { Button, Chip } from "../components/ui";
import { useClassDatasets } from "../lib/classDatasets";
import { RADIUS, SPACING, useTheme } from "../lib/theme";

const EXPORT_WIDTH = 1200;
const EXPORT_SCALE = 1.9;

const EVERYONE = "everyone";

function ShareCard({
  model,
  theme,
  scale,
}: {
  model: ShareModel;
  theme: SurfaceTheme;
  scale: number;
}) {
  const px = (value: number) => Math.round(value * scale);

  return (
    <View
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.line,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: px(RADIUS.lg),
        padding: px(SPACING.lg),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottomColor: theme.line,
          borderBottomWidth: StyleSheet.hairlineWidth,
          paddingBottom: px(SPACING.md),
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: theme.fg, fontSize: px(24), fontWeight: "700" }}
            numberOfLines={1}
          >
            {model.title}
          </Text>
          <Text style={{ color: theme.fgMuted, fontSize: px(13), marginTop: px(2) }}>
            {model.subtitle}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: theme.fg, fontSize: px(22), fontWeight: "700" }}>
            {model.lectures}
          </Text>
          <Text style={{ color: theme.fgFaint, fontSize: px(10) }}>LECTURES / WEEK</Text>
        </View>
      </View>

      {model.rows.length === 0 ? (
        <Text
          style={{
            color: theme.fgMuted,
            textAlign: "center",
            paddingVertical: px(SPACING.xl),
            fontSize: px(13),
          }}
        >
          No lectures for this selection
        </Text>
      ) : (
        <View style={{ marginTop: px(SPACING.sm) }}>
          <View style={{ flexDirection: "row", paddingVertical: px(SPACING.xs) }}>
            <Text style={{ width: px(46), color: theme.fgFaint, fontSize: px(10) }}>
              PERIOD
            </Text>
            {model.days.map((day) => (
              <Text
                key={day.id}
                style={{
                  flex: 1,
                  color: theme.fgFaint,
                  fontSize: px(11),
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
                paddingVertical: px(SPACING.xs),
                alignItems: "center",
              }}
            >
              <View style={{ width: px(46) }}>
                <Text style={{ color: theme.fg, fontSize: px(16), fontWeight: "700" }}>
                  {row.periodLabel}
                </Text>
                {row.periodName ? (
                  <Text style={{ color: theme.fgFaint, fontSize: px(9) }}>
                    {row.periodName}
                  </Text>
                ) : null}
              </View>
              {model.days.map((day) => {
                const cells = row.byDay[day.id] ?? [];
                return (
                  <View
                    key={day.id}
                    style={{ flex: 1, paddingHorizontal: px(2), gap: px(2) }}
                  >
                    {cells.length === 0 ? (
                      <Text
                        style={{
                          color: theme.fgFaint,
                          fontSize: px(11),
                          textAlign: "center",
                        }}
                      >
                        -
                      </Text>
                    ) : (
                      cells.map((cell, index) => (
                        <View
                          key={`${day.id}-${String(index)}`}
                          style={{
                            backgroundColor: `${cell.color}${theme.chipBgAlpha}`,
                            borderColor: `${cell.color}${theme.chipBorderAlpha}`,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderRadius: px(RADIUS.sm),
                            paddingVertical: px(3),
                            paddingHorizontal: px(4),
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: theme.isDark ? cell.color : cell.deepColor,
                              fontSize: px(11),
                              fontWeight: "600",
                            }}
                            numberOfLines={1}
                          >
                            {cell.sectionName} {cell.subjectCode}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: px(SPACING.md),
        }}
      >
        <Text style={{ color: theme.fgFaint, fontSize: px(10) }}>
          Kaksha · {model.subtitle}
        </Text>
        {model.footnote ? (
          <Text style={{ color: theme.fgFaint, fontSize: px(10) }}>{model.footnote}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ExportSurface({
  model,
  theme,
  fileName,
  onDone,
}: {
  model: ShareModel;
  theme: SurfaceTheme;
  fileName: string;
  onDone: (uri: string | null, problem: string | null) => void;
}) {
  const shotRef = useRef<View>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void captureRef(shotRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        fileName,
      })
        .then((uri) => {
          if (!cancelled) onDone(uri, null);
        })
        .catch((cause: unknown) => {
          if (!cancelled) {
            onDone(null, cause instanceof Error ? cause.message : "Capture failed");
          }
        });
    }, 140);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fileName, onDone]);

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: -EXPORT_WIDTH * 4, top: 0 }}
    >
      <View
        ref={shotRef}
        collapsable={false}
        style={{ width: EXPORT_WIDTH, backgroundColor: theme.bg }}
      >
        <ShareCard model={model} theme={theme} scale={EXPORT_SCALE} />
      </View>
    </View>
  );
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "timetable";
}

export function ShareView({
  dataset,
  derived,
  filters,
}: {
  dataset: ResolvedDataset;
  derived: DerivedView;
  filters: Filters;
}) {
  const appTheme = useTheme();
  const toast = useToast();
  const [teacherId, setTeacherId] = useState<string | null>(filters.teacher[0] ?? null);
  const [exportDark, setExportDark] = useState(appTheme.isDark);
  const [job, setJob] = useState<{
    model: ShareModel;
    theme: SurfaceTheme;
    intent: "share" | "preview";
    fileName: string;
  } | null>(null);
  const [preview, setPreview] = useState<{ uri: string; ratio: number } | null>(null);

  const exportTheme = exportDark ? THEMES.dark : THEMES.light;
  const classData = useClassDatasets(dataset);

  const teacherOptions = useMemo(() => {
    const byId = new Map<string, Teacher>();
    const teaching = new Set<string>();
    for (const source of classData.datasets) {
      for (const teacher of source.teachers) {
        if (!byId.has(teacher.id)) byId.set(teacher.id, teacher);
      }
      for (const entry of source.entries) {
        for (const assignment of entry.assignments) {
          if (assignment.teacher) teaching.add(assignment.teacher.id);
        }
      }
    }
    const merged = [...byId.values()]
      .filter((teacher) => teaching.has(teacher.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [
      { id: EVERYONE, label: "Whole class", sublabel: "Everything that matches" },
      ...merged.map((teacher) => ({
        id: teacher.id,
        label: teacher.name,
        sublabel: teacher.department ?? undefined,
      })),
    ];
  }, [classData.datasets]);

  const model = useMemo(
    () =>
      teacherId
        ? buildTeacherShareModel(classData.datasets, teacherId, filters)
        : buildShareModel(dataset, derived.entries, filters),
    [classData.datasets, dataset, derived.entries, filters, teacherId],
  );

  const awaitingClasses = teacherId !== null && classData.loading;

  useEffect(() => {
    setPreview(null);
  }, [model, exportTheme]);

  async function deliver(uri: string) {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: model.title,
      });
      toast("Image exported", "success");
    } else {
      toast("Sharing is not available on this device", "error");
    }
  }

  return (
    <View style={{ gap: SPACING.md }}>
      <SelectField
        label="Timetable for"
        placeholder="Whole class"
        options={teacherOptions}
        selected={[teacherId ?? EVERYONE]}
        onChange={(ids) => {
          const id = ids[0];
          setTeacherId(!id || id === EVERYONE ? null : id);
        }}
      />

      <View style={{ flexDirection: "row", gap: SPACING.sm, alignItems: "center" }}>
        <Text style={{ color: appTheme.fgFaint, fontSize: 11, letterSpacing: 0.8 }}>
          STYLE
        </Text>
        <Chip
          label="Light"
          active={!exportDark}
          onPress={() => {
            setExportDark(false);
          }}
        />
        <Chip
          label="Dark"
          active={exportDark}
          onPress={() => {
            setExportDark(true);
          }}
        />
      </View>

      <ShareCard model={model} theme={exportTheme} scale={1} />

      {awaitingClasses ? (
        <Text style={{ color: appTheme.fgMuted, fontSize: 12 }}>
          Adding lectures from the other classes
        </Text>
      ) : null}

      {teacherId && classData.missing.length > 0 ? (
        <Text style={{ color: appTheme.fgMuted, fontSize: 12 }}>
          Not included right now: {classData.missing.join(", ")}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label={job?.intent === "preview" ? "Rendering" : "Preview image"}
            icon="eye-outline"
            busy={job?.intent === "preview"}
            disabled={awaitingClasses || job !== null}
            onPress={() => {
              setJob({
                model,
                theme: exportTheme,
                intent: "preview",
                fileName: `kaksha-preview-${Date.now().toString(36)}`,
              });
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={job?.intent === "share" ? "Preparing image" : "Share as image"}
            variant="primary"
            icon="share-social-outline"
            busy={job?.intent === "share"}
            disabled={awaitingClasses || job !== null}
            onPress={() => {
              setJob({
                model,
                theme: exportTheme,
                intent: "share",
                fileName: `kaksha-${slugify(model.title)}`,
              });
            }}
          />
        </View>
      </View>

      {preview ? (
        <View style={{ gap: SPACING.xs }}>
          <Text style={{ color: appTheme.fgFaint, fontSize: 11, letterSpacing: 0.8 }}>
            IMAGE PREVIEW
          </Text>
          <Image
            source={{ uri: preview.uri }}
            resizeMode="contain"
            style={{
              width: "100%",
              aspectRatio: preview.ratio,
              borderRadius: RADIUS.md,
              borderColor: appTheme.line,
              borderWidth: StyleSheet.hairlineWidth,
            }}
          />
          <Text style={{ color: appTheme.fgMuted, fontSize: 11 }}>
            The exact file that will be shared
          </Text>
        </View>
      ) : null}

      {job ? (
        <ExportSurface
          model={job.model}
          theme={job.theme}
          fileName={job.fileName}
          onDone={(uri, problem) => {
            const intent = job.intent;
            setJob(null);
            if (!uri) {
              toast(problem ?? "Could not export the image", "error");
              return;
            }
            if (intent === "share") {
              void deliver(uri);
              return;
            }
            Image.getSize(
              uri,
              (width, height) => {
                setPreview({ uri, ratio: width / height });
              },
              () => {
                setPreview({ uri, ratio: 3 / 2 });
              },
            );
          }}
        />
      ) : null}
    </View>
  );
}
