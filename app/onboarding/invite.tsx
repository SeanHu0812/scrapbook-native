import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Share, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Copy, Check, Share2, MessageCircle, Mail } from "lucide-react-native";
import { Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Card } from "@/components/ui/Card";
import { colors } from "@/theme/colors";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardingInviteScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const createInvite = useMutation(api.invites.create);

  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    createInvite()
      .then(({ code, expiresAt }) => { setCode(code); setExpiresAt(expiresAt); })
      .catch(console.error)
      .finally(() => setCreating(false));
  }, [isAuthenticated]);

  const shareUrl = code ? `https://scrapbook.app/invite/${code}` : "";
  const shareMessage = code ? `join my scrapbook space 🌸 ${shareUrl}` : "";
  const expiresDays = expiresAt
    ? Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
    : 7;

  function handleCopy() {
    if (!code) return;
    Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!code) return;
    try {
      await Share.share({ message: shareMessage, url: shareUrl });
    } catch {
      handleCopy();
    }
  }

  function handleSMS() {
    Linking.openURL(`sms:?&body=${encodeURIComponent(shareMessage)}`);
  }

  function handleWhatsApp() {
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareMessage)}`);
  }

  function handleEmail() {
    Linking.openURL(`mailto:?subject=${encodeURIComponent("join my scrapbook 🌸")}&body=${encodeURIComponent(shareMessage)}`);
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>invite your</Text>
          <Text style={styles.title}>person 💌</Text>
          <Text style={styles.subtitle}>share the link — they join your space</Text>
        </View>

        {/* Code card */}
        <Card tint="pink" style={styles.codeCard}>
          {creating || !code ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.coral} />
            </View>
          ) : (
            <>
              <Text style={styles.codeLabel}>YOUR INVITE CODE</Text>
              <View style={styles.codeRow}>
                {code.split("").map((char, i) => (
                  <View key={i} style={styles.charBox}>
                    <Text style={styles.charText}>{char}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.expiry}>
                expires in {expiresDays} day{expiresDays !== 1 ? "s" : ""}
              </Text>
            </>
          )}
        </Card>

        {/* Copy + Share buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={handleCopy}
            disabled={!code}
            activeOpacity={0.85}
          >
            {copied
              ? <Check size={16} color="#22c55e" />
              : <Copy size={16} color={colors.brown + "99"} />}
            <Text style={styles.outlineBtnText}>{copied ? "Copied!" : "Copy link"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.solidBtn}
            onPress={handleShare}
            disabled={!code}
            activeOpacity={0.85}
          >
            <Share2 size={16} color="#fff" />
            <Text style={styles.solidBtnText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Quick-share row */}
        {code && (
          <View style={styles.quickShareRow}>
            <TouchableOpacity style={styles.quickShareItem} onPress={handleSMS}>
              <View style={[styles.quickShareIcon, { backgroundColor: "#22c55e" }]}>
                <MessageCircle size={20} color="#fff" />
              </View>
              <Text style={styles.quickShareLabel}>iMessage</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickShareItem} onPress={handleWhatsApp}>
              <View style={[styles.quickShareIcon, { backgroundColor: "#25D366" }]}>
                <Text style={styles.waIcon}>W</Text>
              </View>
              <Text style={styles.quickShareLabel}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickShareItem} onPress={handleEmail}>
              <View style={[styles.quickShareIcon, { backgroundColor: colors.coral }]}>
                <Mail size={20} color="#fff" />
              </View>
              <Text style={styles.quickShareLabel}>Email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() => router.replace("/(tabs)/home")}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue to home →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/home")}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 24 },
  title: { fontFamily: "Caveat-Bold", fontSize: 30, color: colors.coral, lineHeight: 36 },
  subtitle: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "99", marginTop: 6 },

  codeCard: { padding: 20, marginBottom: 12, alignItems: "center" },
  loadingBox: { paddingVertical: 24 },
  codeLabel: { fontFamily: "PatrickHand", fontSize: 11, color: colors.brown + "80", letterSpacing: 2, marginBottom: 12 },
  codeRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  charBox: {
    width: 40, height: 48, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: colors.pinkSoft,
    alignItems: "center", justifyContent: "center",
  },
  charText: { fontFamily: "Caveat-Bold", fontSize: 26, color: colors.ink },
  expiry: { fontFamily: "PatrickHand", fontSize: 11, color: colors.brown + "66" },

  actionRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  outlineBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 16,
    paddingVertical: 12, backgroundColor: "#fff",
  },
  outlineBtnText: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.ink },
  solidBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 16, paddingVertical: 12, backgroundColor: colors.coral,
  },
  solidBtnText: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: "#fff" },

  quickShareRow: { flexDirection: "row", justifyContent: "center", gap: 28, marginBottom: 24 },
  quickShareItem: { alignItems: "center", gap: 6 },
  quickShareIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  quickShareLabel: { fontFamily: "PatrickHand", fontSize: 11, color: colors.brown + "99" },
  waIcon: { color: "#fff", fontWeight: "700", fontSize: 18 },

  continueBtn: {
    backgroundColor: colors.coral, borderRadius: 16, paddingVertical: 14,
    alignItems: "center", marginBottom: 12,
  },
  continueBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#fff" },
  skipText: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "80", textAlign: "center", paddingVertical: 8 },
});
