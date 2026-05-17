import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/theme/colors";

// Placeholder — edit screen coming after detail is verified
export default function EditMemoryScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Edit Memory (coming soon)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  text: { fontFamily: "PatrickHand", fontSize: 18, color: colors.brown },
});
