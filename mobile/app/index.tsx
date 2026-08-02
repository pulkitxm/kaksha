import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { EntryEditor, type EditorTarget } from "../src/components/EntryEditor";
import { FilterSheet } from "../src/components/FilterSheet";
import { Header } from "../src/components/Header";
import { Sidebar, type ViewKey } from "../src/components/Sidebar";
import { ClashesView } from "../src/screens/ClashesView";
import { ClassesView } from "../src/screens/ClassesView";
import { NotesView } from "../src/screens/NotesView";
import { SectionsView } from "../src/screens/SectionsView";
import { ShareView } from "../src/screens/ShareView";
import { SubjectsView } from "../src/screens/SubjectsView";
import { TeachersView } from "../src/screens/TeachersView";
import { TimetableView } from "../src/screens/TimetableView";
import { Banner, Button, IconButton } from "../src/components/ui";
import { UpdateCard } from "../src/components/UpdateCard";
import { useLayout } from "../src/lib/layout";
import { useStore } from "../src/lib/store";
import { useAppUpdate } from "../src/lib/update";
import { SPACING, useTheme } from "../src/lib/theme";

export default function Home() {
  const theme = useTheme();
  const layout = useLayout();
  const router = useRouter();
  const store = useStore();
  const [view, setView] = useState<ViewKey>("timetable");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [editing, setEditing] = useState<EditorTarget | null>(null);
  const appUpdate = useAppUpdate();
  const { check: checkForUpdate } = appUpdate;

  useEffect(() => {
    void checkForUpdate();
  }, [checkForUpdate]);

  const clashedEntryIds = useMemo(
    () => new Set(store.clashes.flatMap((clash) => clash.entryIds)),
    [store.clashes],
  );

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
              void store.reload();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { dataset, derived, options } = store;

  const body = (
    <ScrollView
      contentContainerStyle={{
        padding: immersive ? SPACING.sm : SPACING.lg,
        gap: SPACING.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {immersive ? null : <UpdateCard state={appUpdate} />}

      <Animated.View key={view} entering={FadeInDown.duration(220)}>
        {view === "timetable" ? (
          <TimetableView
            dataset={dataset}
            derived={derived}
            clashedEntryIds={clashedEntryIds}
            onEdit={(entry) => {
              setEditing({ mode: "edit", entry });
            }}
            onCreate={(sectionId, periodId) => {
              setEditing({ mode: "create", sectionId, periodId });
            }}
          />
        ) : null}
        {view === "clashes" ? (
          <ClashesView
            dataset={dataset}
            clashes={store.clashes}
            onEdit={(entry) => {
              setEditing({ mode: "edit", entry });
            }}
          />
        ) : null}
        {view === "teachers" ? (
          <TeachersView dataset={dataset} derived={derived} />
        ) : null}
        {view === "subjects" ? <SubjectsView dataset={dataset} /> : null}
        {view === "sections" ? <SectionsView dataset={dataset} /> : null}
        {view === "classes" ? <ClassesView dataset={dataset} /> : null}
        {view === "notes" ? <NotesView /> : null}
        {view === "share" ? (
          <ShareView dataset={dataset} derived={derived} filters={store.filters} />
        ) : null}
      </Animated.View>
    </ScrollView>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={immersive ? ["left", "right"] : ["top", "left", "right"]}
    >
      {immersive ? <StatusBar hidden /> : null}

      {immersive ? null : (
        <Header
          dataset={dataset}
          activeFilterCount={activeFilterCount}
          onOpenFilters={() => {
            setFiltersOpen(true);
          }}
          onToggleImmersive={() => {
            setImmersive(true);
          }}
        />
      )}

      <View style={{ flex: 1, flexDirection: "row" }}>
        {immersive ? null : (
          <Sidebar
            current={view}
            expanded={layout.width >= 900}
            clashCount={store.clashes.length}
            onChange={setView}
            onOpenSettings={() => {
              router.push("/settings");
            }}
          />
        )}
        <View style={{ flex: 1 }}>{body}</View>
      </View>

      {immersive ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{ position: "absolute", right: SPACING.md, bottom: SPACING.md }}
        >
          <IconButton
            icon="contract-outline"
            label="Leave full screen"
            tone="accent"
            onPress={() => {
              setImmersive(false);
            }}
          />
        </Animated.View>
      ) : null}

      <FilterSheet
        visible={filtersOpen}
        dataset={dataset}
        options={options}
        filters={store.filters}
        onApply={store.setFilters}
        onClose={() => {
          setFiltersOpen(false);
        }}
      />

      <EntryEditor
        target={editing}
        dataset={dataset}
        onClose={() => {
          setEditing(null);
        }}
      />
    </SafeAreaView>
  );
}
