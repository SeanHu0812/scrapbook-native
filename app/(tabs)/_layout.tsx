import { useState, useRef, useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import {
  TouchableOpacity, View, StyleSheet, Platform,
  Modal, Animated, Text, Pressable, Alert, ActivityIndicator,
} from "react-native";
import { Home, BookOpen, Images, User, Camera, StickyNote, ImagePlus } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

const ACTIONS = [
  {
    key: "photo",
    label: "Photo",
    icon: ImagePlus,
    color: "#5B8FD4",
    soon: false,
  },
  {
    key: "note",
    label: "Note",
    icon: StickyNote,
    color: colors.brown,
    soon: false,
  },
  {
    key: "memory",
    label: "Memory",
    icon: Camera,
    color: colors.coral,
    soon: false,
  },
] as const;

function FABButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const uploadToAlbum = useMutation(api.memories.uploadToAlbum);

  const rotation = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(ACTIONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (open) {
      Animated.stagger(
        60,
        itemAnims.map((anim) =>
          Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 8, speed: 14 })
        )
      ).start();
    } else {
      itemAnims.forEach((anim) => anim.setValue(0));
    }
  }, [open]);

  function close() {
    setOpen(false);
  }

  async function handlePhotoUpload() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to add photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const storageIds: Id<"_storage">[] = [];
      for (const asset of result.assets) {
        const mimeType = asset.mimeType ?? "image/jpeg";
        const uploadUrl = await generateUploadUrl();
        const res = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { "Content-Type": mimeType },
        });
        const { storageId } = JSON.parse(res.body) as { storageId: Id<"_storage"> };
        storageIds.push(storageId);
      }
      await uploadToAlbum({ storageIds });
    } catch {
      Alert.alert("Upload failed", "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleAction(key: string) {
    close();
    if (key === "photo") {
      setTimeout(() => handlePhotoUpload(), 150);
      return;
    }
    setTimeout(() => {
      if (key === "memory") router.push("/new");
      else if (key === "note") router.push("/new-note");
    }, 150);
  }

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={() => setOpen((v) => !v)} activeOpacity={0.85}>
        {uploading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Animated.View style={[styles.fabInner, { transform: [{ rotate }] }]}>
            <View style={styles.fabPlus} />
            <View style={styles.fabPlusH} />
          </Animated.View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} />

        <View style={styles.menuContainer} pointerEvents="box-none">
          {ACTIONS.map((action, i) => {
            const anim = itemAnims[i];
            const Icon = action.icon;
            return (
              <Animated.View
                key={action.key}
                style={[
                  styles.actionItem,
                  {
                    opacity: anim,
                    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.actionCircle, { backgroundColor: action.color }]}
                  onPress={() => handleAction(action.key)}
                  activeOpacity={0.8}
                >
                  <Icon size={22} color="#fff" strokeWidth={1.8} />
                </TouchableOpacity>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Animated.View>
            );
          })}
        </View>
      </Modal>
    </>
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
          tabBarButton: () => (
            <View style={styles.fabSlot}>
              <FABButton />
            </View>
          ),
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
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen name="calendar" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  menuContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 110 : 90,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 16,
  },

  actionItem: {
    alignItems: "center",
    gap: 6,
  },
  actionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },
  actionLabel: {
    fontFamily: "PatrickHand",
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },
});
