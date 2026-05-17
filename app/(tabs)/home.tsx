import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bell, ChevronDown, ChevronRight, ListChecks } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { useSpace } from "@/lib/useSpace";
import { Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { InvitePartnerCard } from "@/components/ui/InvitePartnerCard";
import { colors } from "@/theme/colors";

export default function HomeScreen() {
  const router = useRouter();
  const { status, space, members, invite } = useSpace();
  const memories = useQuery(api.memories.list) ?? [];
  const allTodos = useQuery(api.todos.list);
  const triad = useQuery(api.dailyQuestions.todayTriad);
  const ensureTriad = useMutation(api.dailyQuestions.ensureTriad);

  const upcomingTodos = (allTodos ?? []).filter((t) => !t.done).slice(0, 2);
  const featuredQuestion = triad?.[0] ?? null;
  const isSolo = status === "solo";

  useEffect(() => { ensureTriad(); }, [ensureTriad]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerTitle}>
            <Text style={styles.spaceName}>{space?.name ?? "our little space"}</Text>
            <ChevronDown size={16} color={colors.brown} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellBtn}>
            <Bell size={20} color={colors.ink} strokeWidth={1.8} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Avatars */}
        <View style={styles.avatarRow}>
          {members.length > 0 ? (
            <>
              <View style={styles.avatarGroup}>
                <UserAvatar
                  name={members[0].name}
                  avatarPreset={members[0].avatarPreset}
                  avatarUrl={members[0].avatarUrl}
                  size={64}
                />
                <Text style={styles.memberName}>{members[0].name}</Text>
              </View>

              <Text style={styles.heartIcon}>♥</Text>

              {members.length > 1 ? (
                <View style={styles.avatarGroup}>
                  <UserAvatar
                    name={members[1].name}
                    avatarPreset={members[1].avatarPreset}
                    avatarUrl={members[1].avatarUrl}
                    size={64}
                  />
                  <Text style={styles.memberName}>{members[1].name}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.avatarGroup}
                  onPress={() => router.push("/onboarding/invite")}
                >
                  <View style={styles.addPartnerCircle}>
                    <Text style={styles.addPartnerPlus}>+</Text>
                  </View>
                  <Text style={styles.addPartnerLabel}>add partner</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.skeletonAvatar} />
          )}
        </View>

        {/* Invite card — solo only */}
        {isSolo && invite && <InvitePartnerCard code={invite.code} />}

        {/* Daily question */}
        <TouchableOpacity
          style={isSolo ? styles.cardMtSmall : styles.cardMt}
          onPress={() => router.push("/daily-question")}
          activeOpacity={0.9}
        >
          <Card tint="blue" style={styles.questionCard}>
            <Text style={styles.cardLabel}>Daily question</Text>
            <Text style={styles.questionText}>
              {featuredQuestion?.prompt ?? "How was your day?"}{" "}
              <Text style={{ color: colors.coral }}>{featuredQuestion?.emoji ?? "💬"}</Text>
            </Text>
            <View style={styles.questionFooter}>
              <View style={styles.answerPill}>
                <Text style={styles.answerPillText}>
                  {featuredQuestion?.myAnswer ? "See answers" : "Answer"}
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Todo card */}
        <TouchableOpacity
          style={styles.cardMtSmall}
          onPress={() => router.push("/todos")}
          activeOpacity={0.9}
        >
          <Card tint="green" style={styles.todoCard}>
            <View style={styles.todoHeader}>
              <View>
                <Text style={styles.cardLabel}>{isSolo ? "My little list" : "Our little list"}</Text>
                <Text style={styles.todoCount}>{upcomingTodos.length} things to do</Text>
              </View>
              <View style={styles.todoIcon}>
                <ListChecks size={20} color={colors.coral} strokeWidth={1.8} />
              </View>
            </View>

            {upcomingTodos.map((t) => (
              <View key={t._id} style={styles.todoRow}>
                <View style={styles.todoCheck} />
                <Text style={styles.todoTitle} numberOfLines={1}>{t.title}</Text>
                {t.due ? <Text style={styles.todoDue}>{t.due}</Text> : null}
              </View>
            ))}

            <View style={styles.openListRow}>
              <Text style={styles.openListText}>Open list</Text>
              <ChevronRight size={14} color={colors.coral} strokeWidth={2} />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Memory timeline */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>Memory timeline</Text>
            <TouchableOpacity
              style={styles.addMemoryBtn}
              onPress={() => router.push("/new")}
            >
              <Text style={styles.addMemoryPlus}>+</Text>
            </TouchableOpacity>
          </View>

          {memories === undefined ? (
            <>
              <MemorySkeleton />
              <MemorySkeleton />
            </>
          ) : memories.length === 0 ? (
            <Card tint="white" style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>no memories yet</Text>
              <Text style={styles.emptySubtitle}>tap + to add your first one</Text>
            </Card>
          ) : (
            memories.slice(0, 5).map((m) => (
              <TouchableOpacity
                key={m._id}
                activeOpacity={0.9}
                onPress={() => router.push(`/memory/${m._id}`)}
              >
                <Card tint="white" style={styles.memoryCard}>
                  <View style={styles.memoryDateRow}>
                    <Text style={styles.memoryDate}>{formatDate(m.date)}</Text>
                    <Text style={styles.memoryWeekday}>{m.weekday} ☀️</Text>
                  </View>
                  <View style={styles.memoryBody}>
                    {m.firstPhotoUrl ? (
                      <Image
                        source={{ uri: m.firstPhotoUrl }}
                        style={styles.memoryPhoto}
                      />
                    ) : (
                      <View style={[styles.memoryPhoto, styles.memoryPhotoPlaceholder]} />
                    )}
                    <View style={styles.memoryInfo}>
                      <Text style={styles.memoryTitle} numberOfLines={1}>{m.title}</Text>
                      <View style={styles.memoryCaptionBox}>
                        <Text style={styles.memoryCaption} numberOfLines={2}>
                          {m.caption || m.body?.slice(0, 60)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MemorySkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonDateRow}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: 64 }]} />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={styles.skeletonPhoto} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={[styles.skeletonLine, { width: "75%" }]} />
          <View style={[styles.skeletonPhoto, { height: 40, borderRadius: 12 }]} />
        </View>
      </View>
    </View>
  );
}

function formatDate(iso: string) {
  const [year, m, d] = iso.split("-").map(Number);
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  return `${months[m - 1]} ${d}, ${year}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, marginBottom: 4 },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 4 },
  spaceName: { fontFamily: "PatrickHand", fontSize: 20, fontWeight: "600", color: colors.ink },
  bellBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  bellDot: { position: "absolute", top: 10, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.coral },

  // Avatars
  avatarRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12, marginBottom: 4 },
  avatarGroup: { alignItems: "center", gap: 6 },
  memberName: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown },
  heartIcon: { fontSize: 20, color: colors.coral, marginBottom: 20 },
  addPartnerCircle: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: colors.brown + "4D", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  addPartnerPlus: { fontSize: 26, color: colors.brown + "66", lineHeight: 30 },
  addPartnerLabel: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "66" },
  skeletonAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.border },

  // Card spacing
  cardMt: { marginTop: 20 },
  cardMtSmall: { marginTop: 12 },

  // Question card
  questionCard: { padding: 16 },
  cardLabel: { fontFamily: "PatrickHand", fontSize: 13, fontWeight: "600", color: colors.brown + "CC", marginBottom: 4 },
  questionText: { fontFamily: "PatrickHand", fontSize: 20, color: colors.ink, lineHeight: 26 },
  questionFooter: { marginTop: 12, alignItems: "flex-end" },
  answerPill: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border,
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  answerPillText: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.ink },

  // Todo card
  todoCard: { padding: 16 },
  todoHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  todoCount: { fontFamily: "PatrickHand", fontSize: 18, color: colors.ink, marginTop: 2 },
  todoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  todoRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  todoCheck: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.brown + "80" },
  todoTitle: { flex: 1, fontFamily: "PatrickHand", fontSize: 14, color: colors.ink },
  todoDue: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "B3" },
  openListRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 2, marginTop: 4 },
  openListText: { fontFamily: "PatrickHand", fontSize: 13, fontWeight: "600", color: colors.coral },

  // Timeline
  timelineSection: { marginTop: 24, gap: 12 },
  timelineHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  timelineTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },
  addMemoryBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.pink, alignItems: "center", justifyContent: "center", shadowColor: colors.pink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 4 },
  addMemoryPlus: { fontSize: 22, color: "#fff", lineHeight: 26 },

  // Memory card
  memoryCard: { padding: 12 },
  memoryDateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  memoryDate: { fontFamily: "PatrickHand", fontSize: 13, fontWeight: "600", color: colors.ink },
  memoryWeekday: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "CC" },
  memoryBody: { flexDirection: "row", gap: 8, alignItems: "center" },
  memoryPhoto: { width: 80, height: 80, borderRadius: 16, flexShrink: 0 },
  memoryPhotoPlaceholder: { backgroundColor: colors.border },
  memoryInfo: { flex: 1, gap: 6 },
  memoryTitle: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.ink, lineHeight: 20 },
  memoryCaptionBox: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, transform: [{ rotate: "-0.5deg" }] },
  memoryCaption: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown, lineHeight: 16 },

  // Empty state
  emptyCard: { padding: 24, alignItems: "center" },
  emptyTitle: { fontFamily: "Caveat-Bold", fontSize: 20, color: colors.coral, marginBottom: 4 },
  emptySubtitle: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "99" },

  // Skeleton
  skeleton: { backgroundColor: "#fff", borderRadius: 24, padding: 12, gap: 8 },
  skeletonDateRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  skeletonLine: { height: 14, width: 112, borderRadius: 8, backgroundColor: colors.border },
  skeletonPhoto: { width: 80, height: 80, borderRadius: 16, backgroundColor: colors.border },
});
