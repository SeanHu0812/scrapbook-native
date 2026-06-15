import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image, Platform, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ArrowLeft, Camera, MapPin, Plus, Trash2, X } from "lucide-react-native";
import { colors } from "@/theme/colors";

function weekdayOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
}
function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[m - 1]} ${d}, ${y}`;
}

export default function EditMemoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const memoryId = id as Id<"memories">;

  const memory = useQuery(api.memories.get, { id: memoryId });
  const updateMemory = useMutation(api.memories.update);
  const addPhotos = useMutation(api.memories.addPhotos);
  const removePhoto = useMutation(api.memories.removePhoto);
  const removeMemory = useMutation(api.memories.remove);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  // Populate fields once memory loads
  useEffect(() => {
    if (!memory) return;
    setTitle(memory.title ?? "");
    setBody(memory.body ?? "");
    setDate(memory.date ?? "");
    setLocation(memory.location ?? "");
  }, [memory?._id]);

  if (memory === undefined) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}><ActivityIndicator color={colors.coral} /></View>
      </SafeAreaView>
    );
  }

  if (!memory) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}><Text style={styles.errorText}>Memory not found.</Text></View>
      </SafeAreaView>
    );
  }

  const photos = memory.photos ?? [];
  const dateObj = new Date((date || memory.date) + "T12:00:00");

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) { setError("Title is required."); return; }
    setError("");
    setSaving(true);
    try {
      await updateMemory({
        id: memoryId,
        title: title.trim(),
        body: body.trim(),
        date,
        weekday: weekdayOf(date),
        location: location.trim() || undefined,
      });
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSaving(false);
    }
  }

  // ── Photos ────────────────────────────────────────────────────────────────

  async function handleAddPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access to add photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    setUploadingPhoto(true);
    try {
      const ids: Id<"_storage">[] = [];
      for (const asset of result.assets) {
        const mimeType = asset.mimeType ?? "image/jpeg";
        const uploadUrl = await generateUploadUrl();
        const uploadResult = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { "Content-Type": mimeType },
        });
        const { storageId } = JSON.parse(uploadResult.body) as { storageId: Id<"_storage"> };
        ids.push(storageId);
      }
      await addPhotos({ id: memoryId, photoStorageIds: ids });
    } catch {
      Alert.alert("Error", "Photo upload failed. Try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto(storageId: Id<"_storage">) {
    Alert.alert("Remove photo", "Remove this photo from the memory?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: () => removePhoto({ memoryId, storageId }),
      },
    ]);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    await removeMemory({ id: memoryId });
    router.replace("/(tabs)/home");
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit memory</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Date */}
        <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
          <Text style={styles.dateHint}>tap to change</Text>
        </TouchableOpacity>

        {showDatePicker && (
          Platform.OS === "ios" ? (
            <Modal transparent animationType="fade">
              <TouchableOpacity style={styles.dateModalBackdrop} onPress={() => setShowDatePicker(false)} activeOpacity={1}>
                <View style={styles.dateModalCard}>
                  <DateTimePicker
                    value={dateObj}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(_, selected) => { if (selected) setDate(selected.toISOString().slice(0, 10)); }}
                    textColor={colors.ink}
                  />
                  <TouchableOpacity style={styles.dateModalDone} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.dateModalDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          ) : (
            <DateTimePicker
              value={dateObj}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(_, selected) => {
                setShowDatePicker(false);
                if (selected) setDate(selected.toISOString().slice(0, 10));
              }}
            />
          )
        )}

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Memory title…"
            placeholderTextColor={colors.brown + "66"}
            maxLength={60}
          />
        </View>

        {/* Body */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <View style={styles.bodyCard}>
            <TextInput
              style={styles.bodyInput}
              value={body}
              onChangeText={setBody}
              placeholder="How was the day?"
              placeholderTextColor={colors.brown + "80"}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Location */}
        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          {location ? (
            <View style={styles.locationFilled}>
              <MapPin size={16} color={colors.coral} strokeWidth={1.8} />
              <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
              <TouchableOpacity onPress={() => setLocation("")}>
                <X size={16} color={colors.brown + "80"} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.locationInput}>
              <MapPin size={16} color={colors.brown + "66"} strokeWidth={1.8} />
              <TextInput
                style={styles.locationTextInput}
                value={location}
                onChangeText={setLocation}
                placeholder="Add a location…"
                placeholderTextColor={colors.brown + "66"}
                returnKeyType="done"
              />
            </View>
          )}
        </View>

        {/* Photos */}
        <View style={styles.field}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.photoGrid}>
            {photos.map((p) => (
              <View key={String(p.storageId)} style={styles.photoThumb}>
                <Image source={{ uri: p.url }} style={styles.photoImg} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => handleRemovePhoto(p.storageId as Id<"_storage">)}
                >
                  <X size={10} color="#fff" strokeWidth={3} />
                </TouchableOpacity>
              </View>
            ))}
            {uploadingPhoto
              ? <View style={[styles.photoThumb, styles.photoLoading]}><ActivityIndicator color={colors.coral} /></View>
              : <TouchableOpacity style={[styles.photoThumb, styles.photoAdd]} onPress={handleAddPhotos}>
                  <Camera size={18} color={colors.brown + "66"} strokeWidth={1.5} />
                  <Plus size={12} color={colors.brown + "66"} style={{ position: "absolute", top: 8, right: 8 }} />
                </TouchableOpacity>
            }
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Delete */}
        <View style={styles.deleteSection}>
          {confirmDelete ? (
            <View style={styles.deleteConfirm}>
              <Text style={styles.deleteConfirmTitle}>Delete this memory?</Text>
              <Text style={styles.deleteConfirmBody}>This can't be undone.</Text>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={handleDelete}>
                <Trash2 size={16} color="#fff" strokeWidth={2} />
                <Text style={styles.deleteConfirmBtnText}>Yes, delete it</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmDelete(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setConfirmDelete(true)} activeOpacity={0.8}>
              <Trash2 size={16} color="#ef4444" strokeWidth={1.8} />
              <Text style={styles.deleteBtnText}>Delete memory</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border + "80",
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },
  saveBtn: {
    backgroundColor: colors.pink, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8,
    shadowColor: colors.pink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 4,
    minWidth: 64, alignItems: "center",
  },
  saveBtnText: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: "#fff" },
  disabled: { opacity: 0.6 },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  dateText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.ink },
  dateHint: { fontFamily: "PatrickHand", fontSize: 12, color: colors.coral },

  dateModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  dateModalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  dateModalDone: { alignItems: "center", paddingVertical: 12 },
  dateModalDoneText: { fontFamily: "PatrickHand", fontSize: 16, fontWeight: "600", color: colors.coral },

  field: { marginBottom: 20 },
  label: { fontFamily: "PatrickHand", fontSize: 13, fontWeight: "600", color: colors.brown, marginBottom: 8 },

  titleInput: {
    fontFamily: "PatrickHand", fontSize: 17, fontWeight: "600", color: colors.ink,
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },

  bodyCard: {
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 14,
  },
  bodyInput: {
    fontFamily: "PatrickHand", fontSize: 15, color: colors.ink,
    minHeight: 90, textAlignVertical: "top",
  },

  locationInput: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  locationTextInput: { flex: 1, fontFamily: "PatrickHand", fontSize: 15, color: colors.ink },
  locationFilled: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  locationText: { flex: 1, fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.ink },

  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumb: { width: 90, height: 90, borderRadius: 16, overflow: "hidden" },
  photoImg: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute", top: 4, right: 4, width: 22, height: 22,
    borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  photoLoading: { backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
  photoAdd: {
    backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },

  errorText: { fontFamily: "PatrickHand", fontSize: 13, color: colors.coral, marginBottom: 8 },

  deleteSection: { marginTop: 12 },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: "#ef444440", borderRadius: 16,
    paddingVertical: 14, backgroundColor: "#ef444408",
  },
  deleteBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#ef4444" },

  deleteConfirm: { gap: 10, alignItems: "center" },
  deleteConfirmTitle: { fontFamily: "PatrickHand", fontSize: 16, fontWeight: "600", color: colors.ink },
  deleteConfirmBody: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "99" },
  deleteConfirmBtn: {
    width: "100%", backgroundColor: "#ef4444", borderRadius: 16,
    paddingVertical: 14, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8,
  },
  deleteConfirmBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#fff" },
  cancelBtn: {
    width: "100%", borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, paddingVertical: 14, alignItems: "center", backgroundColor: "#fff",
  },
  cancelBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.ink },
});
