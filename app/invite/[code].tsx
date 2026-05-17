import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/Card";
import { colors } from "@/theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { AVATAR_SVGS } from "@/constants/avatars";

export default function InviteScreen() {
  const router = useRouter();
  const { code: rawCode } = useLocalSearchParams<{ code: string }>();
  const code = rawCode?.toUpperCase() ?? "";
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const invite = useQuery(api.invites.getByCode, { code });
  const acceptInvite = useMutation(api.invites.accept);
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setError("");
    setAccepting(true);
    try {
      await acceptInvite({ code });
      if (currentUser?.name) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/onboarding/profile?from=invite");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAccepting(false);
    }
  }

  if (invite === undefined || authLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.coral} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (invite.status === "not_found" || invite.status === "expired" || invite.status === "used") {
    const messages = {
      not_found: { title: "link not found 🔍", body: "This invite link doesn't exist. Double-check the URL." },
      expired: { title: "link expired ⏰", body: "This invite has expired. Ask your partner to send a new one." },
      used: { title: "already accepted 🌸", body: "This invite has already been used." },
    };
    const { title, body } = messages[invite.status];
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>{title}</Text>
          <Text style={styles.errorBody}>{body}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace("/(tabs)/home")}>
            <Text style={styles.primaryBtnText}>Go to home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { inviterName, avatarPreset, avatarUrl } = invite;
  const avatarSvg = avatarPreset ? AVATAR_SVGS[avatarPreset] : null;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>you're invited</Text>
          <Text style={styles.title}>to a space 💌</Text>
        </View>

        {/* Inviter card */}
        <Card tint="pink" style={styles.inviterCard}>
          <View style={styles.avatarCircle}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : avatarSvg ? (
              <SvgXml xml={avatarSvg} width="100%" height="100%" />
            ) : (
              <Text style={styles.avatarInitial}>
                {inviterName?.[0]?.toUpperCase() ?? "?"}
              </Text>
            )}
          </View>
          <Text style={styles.inviterName}>{inviterName || "someone"}</Text>
          <Text style={styles.inviterSubtitle}>wants you in their scrapbook space</Text>
        </Card>

        {error ? <Text style={styles.errorInline}>{error}</Text> : null}

        {isAuthenticated ? (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, accepting && styles.disabled]}
              onPress={handleAccept}
              disabled={accepting}
              activeOpacity={0.85}
            >
              {accepting && <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />}
              <Text style={styles.primaryBtnText}>Accept & join their space</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace("/(tabs)/home")}>
              <Text style={styles.skipText}>Maybe later</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push(`/(auth)/sign-up?next=/invite/${code}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Sign up to join</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => router.push(`/(auth)/sign-in?next=/invite/${code}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.outlineBtnText}>I already have an account</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 },

  header: { alignItems: "center", marginBottom: 24 },
  title: { fontFamily: "Caveat-Bold", fontSize: 30, color: colors.coral, lineHeight: 36 },

  inviterCard: { padding: 24, alignItems: "center", marginBottom: 24 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40, overflow: "hidden",
    borderWidth: 2, borderColor: "#fff",
    backgroundColor: colors.pinkSoft,
    marginBottom: 12,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarInitial: { fontFamily: "Caveat-Bold", fontSize: 32, color: colors.coral, textAlign: "center", lineHeight: 80 },
  inviterName: { fontFamily: "Caveat-Bold", fontSize: 22, color: colors.ink, marginBottom: 4 },
  inviterSubtitle: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "99" },

  errorTitle: { fontFamily: "Caveat-Bold", fontSize: 28, color: colors.coral, textAlign: "center" },
  errorBody: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "99", textAlign: "center" },
  errorInline: { fontFamily: "PatrickHand", fontSize: 13, color: colors.coral, textAlign: "center", marginBottom: 12 },

  primaryBtn: {
    backgroundColor: colors.coral, borderRadius: 16, paddingVertical: 14,
    alignItems: "center", flexDirection: "row", justifyContent: "center",
    marginBottom: 12,
  },
  disabled: { opacity: 0.6 },
  primaryBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#fff" },
  outlineBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingVertical: 14,
    alignItems: "center", backgroundColor: "#fff", marginBottom: 12,
  },
  outlineBtnText: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.ink },
  skipText: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "80", textAlign: "center", paddingVertical: 8 },
});
