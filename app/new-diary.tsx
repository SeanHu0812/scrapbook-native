import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { colors } from "@/theme/colors";

export default function NewDiaryScreen() {
  const router = useRouter();
  const createDiary = useMutation(api.diaries.create);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<TextInput>(null);

  async function handleSave() {
    if (!body.trim() || saving) return;
    setSaving(true);
    try {
      await createDiary({
        title: title.trim() || undefined,
        body: body.trim(),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <X size={20} color={colors.ink} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Dear Diary</Text>
          <TouchableOpacity
            style={[styles.saveBtn, (!body.trim() || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!body.trim() || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Date */}
          <Text style={styles.dateLabel}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</Text>

          {/* Title input */}
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Give this entry a title (optional)"
            placeholderTextColor={colors.brown + "50"}
            returnKeyType="next"
            onSubmitEditing={() => bodyRef.current?.focus()}
          />

          {/* Divider */}
          <View style={styles.divider} />

          {/* Body input */}
          <TextInput
            ref={bodyRef}
            style={styles.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="Write what's on your heart…"
            placeholderTextColor={colors.brown + "50"}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FDFAF6" },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8,
  },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { fontFamily: "Caveat-Bold", fontSize: 22, color: colors.ink },
  saveBtn: {
    backgroundColor: colors.brown, borderRadius: 100,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#fff" },

  scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },

  dateLabel: {
    fontFamily: "PatrickHand", fontSize: 13,
    color: colors.brown + "80", marginBottom: 16,
  },

  titleInput: {
    fontFamily: "Caveat-Bold", fontSize: 26,
    color: colors.ink, paddingVertical: 0,
    marginBottom: 4,
  },

  divider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },

  bodyInput: {
    fontFamily: "PatrickHand", fontSize: 17,
    color: colors.ink, lineHeight: 28,
    minHeight: 300,
  },
});
