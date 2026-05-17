import { Redirect } from "expo-router";
import { useAuth } from "@/lib/convex";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF9EF" }}>
        <ActivityIndicator color="#F98592" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "/(tabs)/home" : "/(auth)/sign-in"} />;
}
