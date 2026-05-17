import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Copy, Check, Share2 } from "lucide-react-native";
import { Card } from "./Card";
import { colors } from "@/theme/colors";

type Props = { code: string };

export function InvitePartnerCard({ code }: Props) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `https://scrapbook.app/invite/${code}`;

  function handleCopy() {
    Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Join my scrapbook! Use code ${code} or open: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      handleCopy();
    }
  }

  return (
    <Card tint="pink" style={styles.card}>
      <Text style={styles.title}>Invite your partner 💌</Text>
      <View style={styles.codePill}>
        <Text style={styles.code}>{code}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.outlineBtn} onPress={handleCopy} activeOpacity={0.8}>
          {copied
            ? <Check size={14} color="#22c55e" />
            : <Copy size={14} color={colors.brown + "99"} />}
          <Text style={styles.outlineBtnText}>{copied ? "Copied!" : "Copy link"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.solidBtn} onPress={handleShare} activeOpacity={0.8}>
          <Share2 size={14} color="#fff" />
          <Text style={styles.solidBtnText}>Share</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 16 },
  title: { fontFamily: "Caveat-Bold", fontSize: 20, color: colors.coral, marginBottom: 8 },
  codePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: colors.pinkSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  code: { fontFamily: "PatrickHand", fontSize: 15, letterSpacing: 3, color: colors.ink },
  actions: { flexDirection: "row", gap: 8 },
  outlineBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingVertical: 8, backgroundColor: "#fff",
  },
  outlineBtnText: { fontFamily: "PatrickHand", fontSize: 13, fontWeight: "600", color: colors.ink },
  solidBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 12, paddingVertical: 8, backgroundColor: colors.coral,
  },
  solidBtnText: { fontFamily: "PatrickHand", fontSize: 13, fontWeight: "600", color: "#fff" },
});
