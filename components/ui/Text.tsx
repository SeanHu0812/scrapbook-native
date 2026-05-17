import { Text as RNText, TextProps, StyleSheet } from "react-native";

export function Text({ style, ...props }: TextProps) {
  return <RNText style={[styles.base, style]} {...props} />;
}

export function HandwriteText({ style, ...props }: TextProps) {
  return <RNText style={[styles.handwrite, style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: "PatrickHand",
    color: "#2F2A28",
  },
  handwrite: {
    fontFamily: "Caveat-Bold",
    color: "#2F2A28",
  },
});
