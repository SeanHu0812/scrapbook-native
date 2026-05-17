import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft } from "lucide-react-native";
import { useSpace } from "@/lib/useSpace";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";

type Tint = "pink" | "yellow" | "blue" | "green";

const TINT_BG: Record<Tint, string> = {
  pink: colors.pinkSoft,
  yellow: colors.yellowSoft,
  blue: colors.blueSoft,
  green: colors.greenSoft,
};

function formatDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}`;
}

export default function DailyQuestionScreen() {
  const router = useRouter();
  const { status, members, currentUser } = useSpace();
  const isSolo = status === "solo";

  const [tab, setTab] = useState<"today" | "history">("today");

  const ensureTriad = useMutation(api.dailyQuestions.ensureTriad);
  const triad = useQuery(api.dailyQuestions.todayTriad);
  const historyItems = useQuery(
    api.dailyQuestions.history,
    tab === "history" ? {} : "skip"
  );

  useEffect(() => { ensureTriad(); }, []);

  const partnerName = isSolo
    ? null
    : members.find((m) => m.userId !== currentUser?._id)?.name ?? "your partner";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily question</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>☀️</Text>
        <Text style={styles.heroText}>
          Answer a question together{"\n"}every day and discover{"\n"}more about each other. 🤍
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "today" && styles.tabActive]}
          onPress={() => setTab("today")}
        >
          <Text style={[styles.tabText, tab === "today" && styles.tabTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "history" && styles.tabActive]}
          onPress={() => setTab("history")}
        >
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "today" ? (
          triad === undefined ? (
            <View style={styles.skeletonList}>
              {[1, 2, 3].map((i) => <View key={i} style={styles.skeletonCard} />)}
            </View>
          ) : triad.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>loading today's questions…</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {triad.map((q) => (
                <QuestionCard
                  key={q._id}
                  id={q._id}
                  prompt={q.prompt}
                  emoji={q.emoji}
                  tint={(q.tint as Tint) ?? "blue"}
                  myAnswer={q.myAnswer}
                  partnerAnswer={q.partnerAnswer}
                  isSolo={isSolo}
                  partnerName={partnerName}
                />
              ))}
            </View>
          )
        ) : (
          historyItems === undefined ? (
            <View style={styles.skeletonList}>
              {[1, 2, 3].map((i) => <View key={i} style={[styles.skeletonCard, { height: 96 }]} />)}
            </View>
          ) : historyItems.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>no answers yet</Text>
              <Text style={styles.emptySubtitle}>Answer today's questions to start your history ☁️</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {historyItems.map((item, i) => item && (
                <View key={i} style={[styles.historyCard, { backgroundColor: TINT_BG[(item.tint as Tint) ?? "blue"] }]}>
                  <View style={styles.historyPromptRow}>
                    <Text style={styles.historyEmoji}>{item.emoji}</Text>
                    <Text style={styles.historyPrompt}>{item.prompt}</Text>
                  </View>
                  <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                  <View style={styles.bubbleList}>
                    <AnswerBubble label="you" body={item.myAnswer} />
                    {!isSolo && (
                      <AnswerBubble label={partnerName ?? "partner"} body={item.partnerAnswer} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          )
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Question card ──────────────────────────────────────────────────────────────

function QuestionCard({
  id, prompt, emoji, tint, myAnswer, partnerAnswer, isSolo, partnerName,
}: {
  id: Id<"dailyQuestions">;
  prompt: string;
  emoji: string;
  tint: Tint;
  myAnswer: string | null;
  partnerAnswer: string | null | "locked";
  isSolo: boolean;
  partnerName: string | null;
}) {
  const submitAnswer = useMutation(api.dailyQuestions.answer);
  const [draft, setDraft] = useState(myAnswer ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!myAnswer);

  async function save() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await submitAnswer({ questionId: id, body: draft.trim() });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const bg = TINT_BG[tint];

  return (
    <View style={[styles.qCard, { backgroundColor: bg }]}>
      {/* Prompt */}
      <View style={styles.promptRow}>
        <Text style={styles.promptEmoji}>{emoji}</Text>
        <Text style={styles.promptText}>{prompt}</Text>
      </View>

      {/* My answer */}
      {saved && myAnswer !== null ? (
        <AnswerBubble label="you" body={myAnswer || draft} />
      ) : (
        <View style={styles.inputArea}>
          <TextInput
            style={styles.answerInput}
            value={draft}
            onChangeText={(t) => { setDraft(t); setSaved(false); }}
            placeholder="Your answer…"
            placeholderTextColor={colors.brown + "80"}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.saveBtn, (!draft.trim() || saving) && styles.saveBtnDisabled]}
            onPress={save}
            disabled={saving || !draft.trim()}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>Save answer</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Partner answer */}
      {!isSolo && (
        <View style={styles.partnerArea}>
          {partnerAnswer === "locked" ? (
            <Text style={styles.lockedText}>
              Answer first to see {partnerName ?? "partner"}'s reply 🔒
            </Text>
          ) : partnerAnswer ? (
            <AnswerBubble label={partnerName ?? "partner"} body={partnerAnswer} />
          ) : (
            <Text style={styles.waitingText}>
              Waiting on {partnerName ?? "partner"} to answer… ☁️
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Answer bubble ──────────────────────────────────────────────────────────────

function AnswerBubble({ label, body }: { label: string; body: string | null }) {
  if (!body) return null;
  return (
    <View style={styles.bubble}>
      <Text style={styles.bubbleLabel}>{label}</Text>
      <Text style={styles.bubbleBody}>{body}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border + "60",
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },

  hero: { alignItems: "center", paddingVertical: 20, gap: 8 },
  heroEmoji: { fontSize: 48 },
  heroText: {
    fontFamily: "PatrickHand", fontSize: 15, color: colors.brown,
    textAlign: "center", lineHeight: 22,
  },

  tabRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border,
    marginHorizontal: 20,
  },
  tab: { flex: 1, paddingBottom: 10, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.coral },
  tabText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.brown + "B3" },
  tabTextActive: { color: colors.coral },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  skeletonList: { gap: 12 },
  skeletonCard: { height: 128, borderRadius: 24, backgroundColor: colors.border },

  empty: { marginTop: 64, alignItems: "center", gap: 8 },
  emptyTitle: { fontFamily: "Caveat-Bold", fontSize: 26, color: colors.coral },
  emptySubtitle: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "99" },

  cardList: { gap: 16 },

  qCard: {
    borderRadius: 24, padding: 16, gap: 12,
    ...(shadows.card as object),
  },
  promptRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  promptEmoji: { fontSize: 24, lineHeight: 28 },
  promptText: { flex: 1, fontFamily: "PatrickHand", fontSize: 16, fontWeight: "600", color: colors.ink, lineHeight: 22 },

  inputArea: { gap: 8 },
  answerInput: {
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)", paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: "PatrickHand", fontSize: 14, color: colors.ink, minHeight: 60,
  },
  saveBtn: {
    alignSelf: "flex-start", backgroundColor: colors.coral, borderRadius: 32,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: "#fff" },

  partnerArea: { marginTop: 2 },
  lockedText: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "99", fontStyle: "italic" },
  waitingText: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "99", fontStyle: "italic" },

  bubble: {
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)", paddingHorizontal: 12, paddingVertical: 8, gap: 2,
  },
  bubbleLabel: { fontFamily: "PatrickHand", fontSize: 11, fontWeight: "600", color: colors.brown + "B3" },
  bubbleBody: { fontFamily: "PatrickHand", fontSize: 14, color: colors.ink, lineHeight: 20 },
  bubbleList: { gap: 6, marginTop: 4 },

  historyCard: {
    borderRadius: 24, padding: 16, gap: 8,
    ...(shadows.card as object),
  },
  historyPromptRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  historyEmoji: { fontSize: 20, lineHeight: 24 },
  historyPrompt: { flex: 1, fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.ink, lineHeight: 20 },
  historyDate: { fontFamily: "PatrickHand", fontSize: 11, color: colors.brown + "99" },
});
