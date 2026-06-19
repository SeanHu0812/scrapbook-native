import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity, View, StyleSheet, Platform } from "react-native";
import { Home, BookOpen, Images, User } from "lucide-react-native";
import { colors } from "@/theme/colors";

function FABButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => router.push("/new")}
      activeOpacity={0.85}
    >
      <View style={styles.fabInner}>
        <View style={styles.fabPlus} />
        <View style={styles.fabPlusH} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.brown + "99",
        tabBarLabelStyle: { fontFamily: "PatrickHand", fontSize: 11, marginBottom: 2 },
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="new-memory"
        options={{
          title: "",
          tabBarButton: () => <FABButton />,
        }}
      />
      <Tabs.Screen
        name="album"
        options={{
          title: "Album",
          tabBarIcon: ({ color, size }) => <Images size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fab: {
    top: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.coral,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.pink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  fabInner: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  fabPlus: { position: "absolute", width: 2, height: 18, backgroundColor: "#fff", borderRadius: 1 },
  fabPlusH: { position: "absolute", width: 18, height: 2, backgroundColor: "#fff", borderRadius: 1 },
});
