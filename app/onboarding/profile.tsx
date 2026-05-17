import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AvatarGallery } from "@/components/ui/AvatarGallery";
import { Card } from "@/components/ui/Card";
import { colors } from "@/theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingProfileScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isFromInvite = from === "invite";

  const updateProfile = useMutation(api.users.updateProfile);

  const [name, setName] = useState("");
  const [avatarPreset, setAvatarPreset] = useState<string>("a01");
  const [avatarStorageId, setAvatarStorageId] = useState<string | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSelectPreset(id: string) {
    setAvatarPreset(id);
    setAvatarStorageId(null);
    setUploadPreviewUrl(null);
  }

  function handleUpload(storageId: string, previewUrl: string) {
    setAvatarStorageId(storageId);
    setAvatarPreset("");
    setUploadPreviewUrl(previewUrl);
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter your name."); return; }
    if (trimmed.length > 24) { setError("Name must be 24 characters or less."); return; }
    setError("");
    setLoading(true);
    try {
      await updateProfile({
        name: trimmed,
        avatarPreset: avatarStorageId ? undefined : avatarPreset,
        avatarStorageId: avatarStorageId ? (avatarStorageId as Id<"_storage">) : undefined,
      });
      router.replace(isFromInvite ? "/(tabs)/home" : "/onboarding/invite");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>your space,</Text>
            <Text style={styles.title}>your face 🌸</Text>
            <Text style={styles.subtitle}>set up how you appear to your partner</Text>
          </View>

          {/* Card */}
          <Card tint="white" style={styles.card}>
            <Text style={styles.sectionLabel}>Choose an avatar</Text>
            <AvatarGallery
              selectedPreset={avatarStorageId ? null : avatarPreset}
              onSelectPreset={handleSelectPreset}
              onUpload={handleUpload}
              uploadPreviewUrl={uploadPreviewUrl}
            />

            <View style={styles.nameField}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. mia"
                placeholderTextColor={colors.brown + "66"}
                maxLength={24}
                autoComplete="nickname"
                autoCapitalize="words"
              />
              <Text style={styles.charCount}>{name.length}/24</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitBtnText}>
                    {isFromInvite ? "Save & go home" : "Continue →"}
                  </Text>
              }
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 24 },
  title: { fontFamily: "Caveat-Bold", fontSize: 30, color: colors.coral, lineHeight: 36 },
  subtitle: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "99", marginTop: 6 },
  card: { padding: 20, gap: 20 },
  sectionLabel: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "CC", marginBottom: 4 },
  nameField: { gap: 4 },
  label: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "CC" },
  input: {
    backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, fontFamily: "PatrickHand", color: colors.ink,
  },
  charCount: { fontFamily: "PatrickHand", fontSize: 11, color: colors.brown + "80", textAlign: "right" },
  error: { fontFamily: "PatrickHand", fontSize: 13, color: colors.coral },
  submitBtn: {
    backgroundColor: colors.coral, borderRadius: 16, paddingVertical: 14,
    alignItems: "center",
  },
  disabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#fff" },
});
