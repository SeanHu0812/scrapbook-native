import { View, ViewStyle, StyleSheet } from "react-native";
import { shadows } from "@/theme/shadows";
import { colors } from "@/theme/colors";

const TINTS: Record<string, string> = {
  white: "#ffffff",
  blue: colors.blueSoft,
  green: colors.greenSoft,
  yellow: colors.yellowSoft,
  pink: colors.pinkSoft,
  cream: colors.cream,
};

type Props = {
  tint?: keyof typeof TINTS;
  style?: ViewStyle;
  children: React.ReactNode;
};

export function Card({ tint = "white", style, children }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: TINTS[tint] ?? "#fff" }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    ...(shadows.card as object),
  },
});
