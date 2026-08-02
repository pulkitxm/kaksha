import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { EntryEditor, type EditorTarget } from "../src/components/EntryEditor";
import { FilterSheet } from "../src/components/FilterSheet";
import { Header } from "../src/components/Header";
import { Sidebar, type ViewKey } from "../src/components/Sidebar";
import { TabHost } from "../src/components/TabHost";
import { ClashesView } from "../src/screens/ClashesView";
import { ClassesView } from "../src/screens/ClassesView";
import { NotesView } from "../src/screens/NotesView";
import { SectionsView } from "../src/screens/SectionsView";
import { SettingsView } from "../src/screens/SettingsView";
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

  const { dataset, derived, options } = store;

  const tabs = useMemo(() => {
    if (!dataset || !derived) return [];

    return [
      {
        key: "timetable" as ViewKey,
        render: () => (
          <>
            {immersive ? null : <UpdateCard state={appUpdate} />}
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
          </>
        ),
      },
      {
        key: "clashes" as ViewKey,
        render: () => (
          <ClashesView
            dataset={dataset}
            clashes={store.clashes}
            onEdit={(entry) => {
              setEditing({ mode: "edit", entry });
            }}
          />
        ),
      },
      {
        key: "teachers" as ViewKey,
        render: () => <TeachersView dataset={dataset} derived={derived} />,
      },
      { key: "subjects" as ViewKey, render: () => <SubjectsView dataset={dataset} /> },
      { key: "sections" as ViewKey, render: () => <SectionsView dataset={dataset} /> },
      {
        key: "classes" as ViewKey,
        render: () => (
          <ClassesView
            dataset={dataset}
            onOpened={() => {
              setView("timetable");
            }}
          />
        ),
      },
      { key: "notes" as ViewKey, render: () => <NotesView /> },
      {
        key: "share" as ViewKey,
        render: () => (
          <ShareView dataset={dataset} derived={derived} filters={store.filters} />
        ),
      },
      { key: "settings" as ViewKey, render: () => <SettingsView /> },
    ];
  }, [
    appUpdate,
    clashedEntryIds,
    dataset,
    derived,
    immersive,
    store.clashes,
    store.filters,
  ]);

  if (store.status === "loading" && !dataset) {
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

  if (store.status === "error" || !dataset || !derived || !options) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, padding: SPACING.lg }}>
        <Banner text={store.error ?? "Could not load the timetable"} tone="error" />
        <View style={{ marginTop: SPACING.lg }}>
          <Button
            label="Retry"
            variant="primary"
            onPress={() => {
              void store.syncNow();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

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
          />
        )}
        <TabHost current={view} compact={immersive} tabs={tabs} />
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
