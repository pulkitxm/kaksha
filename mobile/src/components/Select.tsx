import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { swatch } from "@kaksha/core";

import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { Sheet } from "./Sheet";
import { Button, PressableScale } from "./ui";

export type SelectOption = {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
  color?: string;
};

function initials(label: string): string {
  const parts = label
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2);
  if (parts.length === 0) return label.slice(0, 2).toUpperCase();
  return parts.map((part) => part.slice(0, 1).toUpperCase()).join("");
}

const AVATAR_TONES = ["blue", "orange", "violet", "emerald", "rose", "teal"] as const;

function avatarTone(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length] ?? "blue";
}

export function SelectSheet({
  visible,
  title,
  subtitle,
  options,
  selected,
  multi,
  searchPlaceholder,
  onChange,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: SelectOption[];
  selected: string[];
  multi?: boolean;
  searchPlaceholder?: string;
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(selected);

  useEffect(() => {
    if (visible) {
      setQuery("");
      setDraft(selected);
    }
  }, [visible, selected]);

  const searchable = options.length > 7;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        (option.sublabel?.toLowerCase().includes(needle) ?? false),
    );
  }, [options, query]);

  const active = multi ? draft : selected;

  function pick(id: string) {
    if (multi) {
      setDraft((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
      );
    } else {
      onChange([id]);
      onClose();
    }
  }

  return (
    <Sheet
      visible={visible}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        multi ? (
          <View style={{ flexDirection: "row", gap: SPACING.md }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Clear"
                disabled={draft.length === 0}
                onPress={() => {
                  setDraft([]);
                }}
              />
            </View>
            <View style={{ flex: 2 }}>
              <Button
                label={
                  draft.length > 0 ? `Apply ${String(draft.length)} selected` : "Apply"
                }
                variant="primary"
                onPress={() => {
                  onChange(draft);
                  onClose();
                }}
              />
            </View>
          </View>
        ) : undefined
      }
    >
      {searchable ? (
        <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.sm,
              backgroundColor: theme.bgSubtle,
              borderColor: theme.line,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: RADIUS.md,
              paddingHorizontal: SPACING.md,
            }}
          >
            <Ionicons name="search" size={16} color={theme.fgFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder ?? "Search"}
              placeholderTextColor={theme.fgFaint}
              style={{ flex: 1, color: theme.fg, minHeight: 44, fontSize: 14 }}
            />
            {query.length > 0 ? (
              <PressableScale
                label="Clear search"
                onPress={() => {
                  setQuery("");
                }}
              >
                <Ionicons name="close-circle" size={16} color={theme.fgFaint} />
              </PressableScale>
            ) : null}
          </View>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(option) => option.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: SPACING.sm }}
        ListEmptyComponent={
          <Text
            style={{
              color: theme.fgMuted,
              textAlign: "center",
              paddingVertical: SPACING.xl,
              fontSize: 13,
            }}
          >
            Nothing matches "{query}"
          </Text>
        }
        renderItem={({ item }) => {
          const isActive = active.includes(item.id);
          const tone = swatch(item.color ?? avatarTone(item.id));
          return (
            <Animated.View entering={FadeIn.duration(150)}>
              <PressableScale
                label={item.label}
                selected={isActive}
                pressedScale={0.98}
                onPress={() => {
                  pick(item.id);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: SPACING.md,
                  paddingVertical: 10,
                  paddingHorizontal: SPACING.md,
                  borderRadius: RADIUS.md,
                  backgroundColor: isActive ? `${theme.accent}14` : "transparent",
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: RADIUS.pill,
                    backgroundColor: `${tone.base}26`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {item.color ? (
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: RADIUS.pill,
                        backgroundColor: tone.base,
                      }}
                    />
                  ) : (
                    <Text
                      style={{
                        color: theme.isDark ? tone.light : tone.deep,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {initials(item.label)}
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.fg,
                      fontSize: 14,
                      fontWeight: isActive ? "600" : "400",
                    }}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {item.sublabel ? (
                    <Text
                      style={{ color: theme.fgFaint, fontSize: 11, marginTop: 1 }}
                      numberOfLines={1}
                    >
                      {item.sublabel}
                    </Text>
                  ) : null}
                </View>

                {item.badge ? (
                  <Text
                    style={{
                      color: theme.fgMuted,
                      fontSize: 12,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {item.badge}
                  </Text>
                ) : null}

                <Ionicons
                  name={
                    multi
                      ? isActive
                        ? "checkbox"
                        : "square-outline"
                      : isActive
                        ? "radio-button-on"
                        : "radio-button-off"
                  }
                  size={19}
                  color={isActive ? theme.accent : theme.lineStrong}
                />
              </PressableScale>
            </Animated.View>
          );
        }}
      />
    </Sheet>
  );
}

export function SelectField({
  label,
  placeholder,
  options,
  selected,
  multi,
  disabled,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: SelectOption[];
  selected: string[];
  multi?: boolean;
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const byId = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );
  const chosen = selected
    .map((id) => byId.get(id)?.label)
    .filter((name): name is string => typeof name === "string");
  const value =
    chosen.length === 0
      ? placeholder
      : chosen.length <= 2
        ? chosen.join(", ")
        : `${chosen[0] ?? ""} +${String(chosen.length - 1)} more`;

  return (
    <View>
      <Text
        style={{
          color: theme.fgFaint,
          fontSize: 11,
          letterSpacing: 0.8,
          marginBottom: SPACING.sm,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <PressableScale
        label={label}
        onPress={() => {
          setOpen(true);
        }}
        disabled={disabled}
        pressedScale={0.98}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: SPACING.sm,
          backgroundColor: theme.panel,
          borderColor: theme.lineStrong,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: RADIUS.md,
          paddingHorizontal: SPACING.md,
          minHeight: 46,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: chosen.length === 0 ? theme.fgFaint : theme.fg,
            fontSize: 14,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
        {chosen.length > 0 && multi ? (
          <View
            style={{
              backgroundColor: theme.accent,
              borderRadius: RADIUS.pill,
              minWidth: 20,
              height: 20,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 5,
            }}
          >
            <Text style={{ color: theme.accentText, fontSize: 11, fontWeight: "700" }}>
              {selected.length}
            </Text>
          </View>
        ) : null}
        <Ionicons name="chevron-down" size={16} color={theme.fgFaint} />
      </PressableScale>

      <SelectSheet
        visible={open}
        title={label}
        options={options}
        selected={selected}
        multi={multi}
        onChange={onChange}
        onClose={() => {
          setOpen(false);
        }}
      />
    </View>
  );
}
