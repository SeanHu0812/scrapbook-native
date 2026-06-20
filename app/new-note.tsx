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

const VANISH_OPTIONS = [
  { label: "1 hr", ms: 3_600_000 },
  { label: "3 hrs", ms: 10_800_000 },
  { label: "12 hrs", ms: 43_200_000 },
  { label: "24 hrs", ms: 86_400_000 },
];

const TEMPLATES: { key: string; label: string; prefix: string }[] = [
  { key: "craving",  label: "I'm craving for...",    prefix: "I'm craving for " },
  { key: "lets-go",  label: "Can we go...",           prefix: "Can we go " },
  { key: "love",     label: "I love when you...",     prefix: "I love when you " },
  { key: "today",    label: "Today I felt...",        prefix: "Today I felt " },
  { key: "tell-you", label: "I want to tell you...", prefix: "I want to tell you " },
];

export default function NewNoteScreen() {
  const router = useRouter();
  const createNote = useMutation(api.notes.create);

  const [body, setBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [vanishMs, setVanishMs] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  function pickTemplate(t: typeof TEMPLATES[number]) {
    setSelectedTemplate(t.key);
    setBody(t.prefix);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSave() {
    if (!body.trim() || saving) return;
    setSaving(true);
    try {
      await createNote({
        body: body.trim(),
        template: selectedTemplate ?? undefined,
        expiresAt: vanishMs != null ? Date.now() + vanishMs : undefined,
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

        {/* Prompt */}
        <Text style={styles.prompt}>Write what you're thinking</Text>

        {/* Input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="say anything…"
          placeholderTextColor={colors.brown + "50"}
          multiline
          autoFocus
          textAlignVertical="top"
        />

        {/* Templates */}
        <ScrollView
          style={styles.templateScroll}
          contentContainerStyle={styles.templateList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Vanish time */}
          <View style={styles.vanishSection}>
            <Text style={styles.vanishLabel}>⏱ Vanish after</Text>
            <View style={styles.vanishRow}>
              {VANISH_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.ms}
                  style={[styles.vanishPill, vanishMs === o.ms && styles.vanishPillActive]}
                  onPress={() => setVanishMs(vanishMs === o.ms ? null : o.ms)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.vanishPillText, vanishMs === o.ms && styles.vanishPillTextActive]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.templateHeader}>Need a starter?</Text>
          {TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.templateCard, selectedTemplate === t.key && styles.templateCardActive]}
              onPress={() => pickTemplate(t)}
              activeOpacity={0.75}
            >
              <Text style={[styles.templateLabel, selectedTemplate === t.key && styles.templateLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  saveBtn: {
    backgroundColor: colors.coral, borderRadius: 100,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#fff" },

  prompt: {
    fontFamily: "Caveat-Bold",
    fontSize: 26,
    color: colors.ink,
    textAlign: "center",
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 12,
  },

  input: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 120,
    fontFamily: "PatrickHand",
    fontSize: 18,
    color: colors.ink,
    lineHeight: 26,
  },

  templateScroll: { marginTop: 20, flexGrow: 0 },
  templateList: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  templateHeader: {
    fontFamily: "PatrickHand", fontSize: 13,
    color: colors.brown + "80", marginBottom: 2,
  },

  templateCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  templateCardActive: {
    borderColor: colors.coral,
    backgroundColor: colors.coral + "0D",
  },
  templateLabel: {
    fontFamily: "PatrickHand", fontSize: 16, color: colors.ink,
  },
  templateLabelActive: { color: colors.coral },

  vanishSection: { marginBottom: 4 },
  vanishLabel: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "80", marginBottom: 8 },
  vanishRow: { flexDirection: "row", gap: 8 },
  vanishPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1, borderColor: colors.border,
    backgroundColor: "#fff",
  },
  vanishPillActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  vanishPillText: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown },
  vanishPillTextActive: { color: "#fff" },
});
