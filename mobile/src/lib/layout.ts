import { useWindowDimensions } from "react-native";

export type LayoutSize = "compact" | "medium" | "expanded";

export type LayoutInfo = {
  size: LayoutSize;
  isTablet: boolean;
  width: number;
  columns: number;
};

export function useLayout(): LayoutInfo {
  const { width } = useWindowDimensions();

  const size: LayoutSize =
    width >= 900 ? "expanded" : width >= 600 ? "medium" : "compact";

  return {
    size,
    isTablet: width >= 600,
    width,
    columns: width >= 1200 ? 3 : width >= 700 ? 2 : 1,
  };
}
