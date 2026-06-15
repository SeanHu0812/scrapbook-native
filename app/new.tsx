import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image, Platform, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  useAudioRecorder, useAudioRecorderState, useAudioPlayer, useAudioPlayerStatus,
  requestRecordingPermissionsAsync, setAudioModeAsync, RecordingPresets,
} from "expo-audio";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  X, CalendarDays, Pencil, Mic, Square, MapPin, Camera, Plus,
} from "lucide-react-native";
import { colors } from "@/theme/colors";

const SCENES = ["coffee", "couple", "sunset", "flowers", "airplane", "river"] as const;

function todayIso() { return new Date().toISOString().slice(0, 10); }
function weekdayOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
}
function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[m - 1]} ${d}, ${y}`;
}
function formatDuration(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

type UploadedPhoto = { storageId: Id<"_storage">; previewUrl: string };

export default function NewMemoryScreen() {
  const router = useRouter();
  const createMemory = useMutation(api.memories.create);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(todayIso());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState("");

  // Photos
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Voice
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500);
  const player = useAudioPlayer(audioUri ?? null);
  const playerStatus = useAudioPlayerStatus(player);

  const isRecording = recorderState.isRecording;
  const isPlaying = playerStatus.playing;
  const recordingSeconds = Math.floor((recorderState.durationMillis ?? 0) / 1000);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    setError("");
    try {
      for (const asset of result.assets) {
        const mimeType = asset.mimeType ?? "image/jpeg";
        const uploadUrl = await generateUploadUrl();
        const uploadResult = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { "Content-Type": mimeType },
        });
        const { storageId } = JSON.parse(uploadResult.body) as { storageId: Id<"_storage"> };
        setPhotos((cur) => [...cur, { storageId, previewUrl: asset.uri }]);
      }
    } catch {
      setError("Photo upload failed. Try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto(storageId: Id<"_storage">) {
    setPhotos((cur) => cur.filter((p) => p.storageId !== storageId));
  }

  // ── Voice ─────────────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert("Permission needed", "Allow microphone access to record."); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setError("Microphone access denied.");
    }
  }

  async function stopRecording() {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    if (recorder.uri) setAudioUri(recorder.uri);
  }

  function togglePlayback() {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }

  function discardAudio() {
    player.remove();
    setAudioUri(null);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    const resolvedTitle = title.trim() || body.trim().split("\n")[0].slice(0, 40) || formatDisplayDate(date);
    if (!resolvedTitle) { setError("Add a title or description."); return; }
    setError("");
    setSaving(true);
    try {
      let audioStorageId: Id<"_storage"> | undefined;
      if (audioUri) {
        const uploadUrl = await generateUploadUrl();
        const uploadResult = await FileSystem.uploadAsync(uploadUrl, audioUri, {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { "Content-Type": "audio/m4a" },
          mimeType: "audio/m4a",
        });
        const { storageId } = JSON.parse(uploadResult.body) as { storageId: Id<"_storage"> };
        audioStorageId = storageId;
      }
      const scene = photos.length > 0 ? "photo" : SCENES[Math.floor(Math.random() * SCENES.length)];
      const id = await createMemory({
        title: resolvedTitle,
        body: body.trim(),
        date,
        weekday: weekdayOf(date),
        scene,
        location: location.trim() || undefined,
        photoStorageIds: photos.map((p) => p.storageId),
        audioStorageId,
      });
      router.replace(`/memory/${id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSaving(false);
    }
  }

  const dateObj = new Date(date + "T12:00:00");

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <X size={20} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New memory</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || uploadingPhoto || isRecording) && styles.disabled]}
          onPress={handleSave}
          disabled={saving || uploadingPhoto || isRecording}
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
        {/* Date row */}
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateLeft} onPress={() => setShowDatePicker(true)}>
            <CalendarDays size={16} color={colors.coral} strokeWidth={1.8} />
            <Text style={styles.dateText}>{formatDisplayDate(date)}</Text>
            <Pencil size={12} color={colors.coral + "80"} />
          </TouchableOpacity>
          <Text style={styles.weekday}>{weekdayOf(date)} ☀️</Text>
        </View>

        {/* Date picker modal (Android) / inline (iOS) */}
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
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Give this memory a title…"
          placeholderTextColor={colors.brown + "66"}
          maxLength={60}
          returnKeyType="next"
        />

        {/* Body */}
        <View style={styles.bodyCard}>
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="How was our day? (optional)"
            placeholderTextColor={colors.brown + "80"}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ── Photos ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Photos</Text>
          {photos.length === 0 ? (
            <TouchableOpacity style={styles.photoDropzone} onPress={handleAddPhotos} disabled={uploadingPhoto}>
              {uploadingPhoto
                ? <ActivityIndicator color={colors.coral} />
                : <>
                    <Camera size={28} color={colors.brown + "66"} strokeWidth={1.5} />
                    <Text style={styles.dropzoneText}>Add photos</Text>
                  </>
              }
            </TouchableOpacity>
          ) : (
            <View style={styles.photoGrid}>
              {photos.map((p) => (
                <View key={p.storageId as string} style={styles.photoThumb}>
                  <Image source={{ uri: p.previewUrl }} style={styles.photoImg} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(p.storageId)}>
                    <X size={10} color="#fff" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              ))}
              {uploadingPhoto
                ? <View style={[styles.photoThumb, styles.photoLoading]}><ActivityIndicator color={colors.coral} /></View>
                : <TouchableOpacity style={[styles.photoThumb, styles.photoAdd]} onPress={handleAddPhotos}>
                    <Plus size={20} color={colors.brown + "66"} />
                  </TouchableOpacity>
              }
            </View>
          )}
        </View>

        {/* ── Voice memo ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Voice memo</Text>
          {audioUri ? (
            <View style={styles.audioCard}>
              <TouchableOpacity style={styles.audioPlayBtn} onPress={togglePlayback}>
                <Text style={styles.audioPlayIcon}>{isPlaying ? "⏸" : "▶"}</Text>
              </TouchableOpacity>
              <Text style={styles.audioDuration}>{formatDuration(recordingSeconds)}</Text>
              <TouchableOpacity onPress={discardAudio} style={styles.audioDiscard}>
                <X size={14} color={colors.brown + "80"} />
                <Text style={styles.audioDiscardText}>Discard</Text>
              </TouchableOpacity>
            </View>
          ) : isRecording ? (
            <View style={styles.recordingRow}>
              <View style={styles.recordingLeft}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTimer}>{formatDuration(recordingSeconds)}</Text>
              </View>
              <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
                <Square size={16} color="#fff" fill="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
              <Mic size={18} color={colors.brown + "99"} strokeWidth={1.8} />
              <Text style={styles.recordBtnText}>Tap to record (up to 60s)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Location ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
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
                placeholder="Search for a place…"
                placeholderTextColor={colors.brown + "66"}
                returnKeyType="done"
              />
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + "80",
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
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  // Date
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  dateLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.ink },
  weekday: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown },

  // Date modal
  dateModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  dateModalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  dateModalDone: { alignItems: "center", paddingVertical: 12 },
  dateModalDoneText: { fontFamily: "PatrickHand", fontSize: 16, fontWeight: "600", color: colors.coral },

  // Title
  titleInput: {
    fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink,
    backgroundColor: "transparent", paddingVertical: 0, marginBottom: 12,
  },

  // Body
  bodyCard: {
    backgroundColor: "#fff", borderRadius: 20,
    shadowColor: "#6C5A4E", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 2, padding: 16, marginBottom: 8,
  },
  bodyInput: {
    fontFamily: "PatrickHand", fontSize: 15, color: colors.ink,
    minHeight: 100, textAlignVertical: "top",
  },

  error: { fontFamily: "PatrickHand", fontSize: 13, color: colors.coral, marginBottom: 8 },

  // Section
  section: { marginTop: 24 },
  sectionLabel: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.brown, marginBottom: 10 },

  // Photo dropzone
  photoDropzone: {
    borderWidth: 2, borderColor: colors.brown + "40", borderStyle: "dashed",
    borderRadius: 20, height: 140, alignItems: "center", justifyContent: "center", gap: 8,
  },
  dropzoneText: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "80" },

  // Photo grid
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumb: { width: 90, height: 90, borderRadius: 16, overflow: "hidden" },
  photoImg: { width: "100%", height: "100%" },
  photoRemove: {
    position: "absolute", top: 4, right: 4, width: 20, height: 20,
    borderRadius: 10, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center",
  },
  photoLoading: { backgroundColor: colors.border, alignItems: "center", justifyContent: "center" },
  photoAdd: { backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },

  // Voice
  recordBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 2, borderColor: colors.brown + "40", borderStyle: "dashed",
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16,
  },
  recordBtnText: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.brown + "99" },
  recordingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 2, borderColor: colors.coral, borderRadius: 20,
    backgroundColor: colors.pinkSoft, paddingHorizontal: 20, paddingVertical: 14,
  },
  recordingLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.coral },
  recordingTimer: { fontFamily: "PatrickHand", fontSize: 16, fontWeight: "600", color: colors.coral },
  stopBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.coral, alignItems: "center", justifyContent: "center",
    shadowColor: colors.coral, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
  audioCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  audioPlayBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.coral, alignItems: "center", justifyContent: "center",
  },
  audioPlayIcon: { fontSize: 14, color: "#fff" },
  audioDuration: { flex: 1, fontFamily: "PatrickHand", fontSize: 15, color: colors.brown },
  audioDiscard: { flexDirection: "row", alignItems: "center", gap: 4 },
  audioDiscardText: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "80" },

  // Location
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
});
