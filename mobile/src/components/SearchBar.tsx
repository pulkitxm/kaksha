import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { RADIUS, SPACING, useTheme } from "../lib/theme";
import { PressableScale } from "./ui";

export function SearchBar({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}) {
  const theme = useTheme();

  return (
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
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.fgFaint}
        style={{ flex: 1, color: theme.fg, minHeight: 44, fontSize: 14 }}
      />
      {value.length > 0 ? (
        <PressableScale
          label="Clear search"
          onPress={() => {
            onChange("");
          }}
        >
          <Ionicons name="close-circle" size={16} color={theme.fgFaint} />
        </PressableScale>
      ) : null}
    </View>
  );
}
