import { useState } from "react";
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Images, Check } from "lucide-react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { colors } from "@/theme/colors";

export default function UploadPhotoScreen() {
  const router = useRouter();
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const uploadToAlbum = useMutation(api.memories.uploadToAlbum);

  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function pickPhotos() {
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
    setPreviews(result.assets.map((a) => a.uri));

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
      setDone(true);
    } catch {
      Alert.alert("Upload failed", "Something went wrong. Please try again.");
      setPreviews([]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={20} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Add to Album</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {done ? (
          <View style={styles.successWrap}>
            <View style={styles.successIcon}>
              <Check size={32} color="#fff" strokeWidth={2.5} />
            </View>
            <Text style={styles.successTitle}>Added to album!</Text>
            <Text style={styles.successSub}>{previews.length} photo{previews.length !== 1 ? "s" : ""} uploaded</Text>
            <View style={styles.previewGrid}>
              {previews.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.previewThumb} resizeMode="cover" />
              ))}
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : uploading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.coral} />
            <Text style={styles.loadingText}>Uploading {previews.length} photo{previews.length !== 1 ? "s" : ""}…</Text>
            <View style={styles.previewGrid}>
              {previews.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.previewThumb} resizeMode="cover" />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <TouchableOpacity style={styles.pickBtn} onPress={pickPhotos} activeOpacity={0.85}>
              <Images size={36} color={colors.brown + "66"} strokeWidth={1.5} />
              <Text style={styles.pickTitle}>Select Photos</Text>
              <Text style={styles.pickSub}>Choose one or more from your library</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border + "80",
  },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },

  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 40 },

  emptyWrap: { flex: 1, alignItems: "center" },
  pickBtn: {
    width: "100%", borderRadius: 24,
    borderWidth: 2, borderColor: colors.brown + "30", borderStyle: "dashed",
    paddingVertical: 52, alignItems: "center", gap: 10,
    backgroundColor: "#fff",
  },
  pickTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },
  pickSub: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "80" },

  loadingWrap: { alignItems: "center", gap: 16 },
  loadingText: { fontFamily: "PatrickHand", fontSize: 16, color: colors.brown },

  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 8 },
  previewThumb: { width: 88, height: 88, borderRadius: 12 },

  successWrap: { alignItems: "center", gap: 12 },
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#4CAF7D",
    alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontFamily: "Caveat-Bold", fontSize: 28, color: colors.ink },
  successSub: { fontFamily: "PatrickHand", fontSize: 15, color: colors.brown + "99", marginBottom: 4 },
  doneBtn: {
    marginTop: 8, backgroundColor: colors.coral,
    borderRadius: 100, paddingHorizontal: 32, paddingVertical: 12,
  },
  doneBtnText: { fontFamily: "PatrickHand", fontSize: 16, fontWeight: "600", color: "#fff" },
});
