import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ResolvedEntry } from "@kaksha/core";

import { EntryEditor } from "../src/components/EntryEditor";
import { FilterSheet } from "../src/components/FilterSheet";
import { GridView } from "../src/screens/GridView";
import { ListView } from "../src/screens/ListView";
import { SectionTools } from "../src/components/SectionTools";
import { ShareView } from "../src/screens/ShareView";
import { TeachersView } from "../src/screens/TeachersView";
import { Banner, Button, StatTile } from "../src/components/ui";
import { useLayout } from "../src/lib/layout";
import { useStore } from "../src/lib/store";
import { SPACING, useTheme } from "../src/lib/theme";
import { NavRail, type ViewKey } from "../src/components/NavRail";

export default function Home() {
  const theme = useTheme();
  const layout = useLayout();
  const store = useStore();
  const [view, setView] = useState<ViewKey>("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [editing, setEditing] = useState<ResolvedEntry | null>(null);

  const activeFilterCount =
    store.filters.teacher.length +
    store.filters.subject.length +
    store.filters.section.length +
    store.filters.day.length +
    store.filters.period.length +
    (store.filters.q ? 1 : 0);

  if (store.status === "loading" && !store.dataset) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.accent} />
          <Text style={{ color: theme.fgMuted, marginTop: SPACING.md }}>
            Loading timetable
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (store.status === "error" || !store.dataset || !store.derived || !store.options) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, padding: SPACING.lg }}>
        <Banner text={store.error ?? "Could not load the timetable"} tone="error" />
        <View style={{ marginTop: SPACING.lg }}>
          <Button
            label="Retry"
            variant="primary"
            onPress={() => {
              void store.refresh();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { dataset, derived, options } = store;
  const stats = derived.stats;

  const body = (
    <ScrollView
      contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        <StatTile
          label={derived.filtersActive ? "Matching" : "Lectures"}
          value={stats.matchedLectures}
          hint={derived.filtersActive ? `of ${String(stats.totalLectures)}` : "per week"}
        />
        <StatTile label="Slots" value={stats.matchedEntries} hint="blocks" />
        <StatTile label="Teachers" value={stats.matchedTeachers} hint="involved" />
        {layout.isTablet ? (
          <StatTile label="Subjects" value={stats.matchedSubjects} hint="involved" />
        ) : null}
      </View>

      {view === "grid" ? (
        <GridView dataset={dataset} derived={derived} onEdit={setEditing} />
      ) : null}
      {view === "list" ? (
        <ListView dataset={dataset} derived={derived} onEdit={setEditing} />
      ) : null}
      {view === "teachers" ? <TeachersView dataset={dataset} derived={derived} /> : null}
      {view === "share" ? (
        <ShareView dataset={dataset} derived={derived} filters={store.filters} />
      ) : null}
    </ScrollView>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top", "left", "right"]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          borderBottomColor: theme.line,
          borderBottomWidth: StyleSheet.hairlineWidth,
          gap: SPACING.sm,
        }}
      >
        <View>
          <Text style={{ color: theme.fg, fontSize: 18, fontWeight: "700" }}>Kaksha</Text>
          <Text style={{ color: theme.fgFaint, fontSize: 12 }}>
            {dataset.currentClass.name} · {String(dataset.sections.length)} sections
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          <Button
            label={
              activeFilterCount > 0 ? `Filters ${String(activeFilterCount)}` : "Filters"
            }
            onPress={() => {
              setFiltersOpen(true);
            }}
          />
          <Button
            label="Sections"
            onPress={() => {
              setSectionsOpen(true);
            }}
          />
        </View>
      </View>

      {layout.isTablet ? (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <NavRail current={view} onChange={setView} expanded />
          <View style={{ flex: 1 }}>{body}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {body}
          <NavRail current={view} onChange={setView} />
        </View>
      )}

      <FilterSheet
        visible={filtersOpen}
        options={options}
        filters={store.filters}
        onApply={store.setFilters}
        onClose={() => {
          setFiltersOpen(false);
        }}
      />

      <SectionTools
        visible={sectionsOpen}
        dataset={dataset}
        onClose={() => {
          setSectionsOpen(false);
        }}
        onSaved={() => {
          void store.refresh();
        }}
      />

      <EntryEditor
        entry={editing}
        dataset={dataset}
        onClose={() => {
          setEditing(null);
        }}
        onSaved={() => {
          void store.refresh();
        }}
      />
    </SafeAreaView>
  );
}
