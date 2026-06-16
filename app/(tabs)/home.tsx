import {
  View, Text, ScrollView, TouchableOpacity, Image, FlatList,
  StyleSheet, Dimensions, ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bell, ChevronDown, ChevronRight, Heart, ListChecks } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useSpace } from "@/lib/useSpace";
import { Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { InvitePartnerCard } from "@/components/ui/InvitePartnerCard";
import { colors } from "@/theme/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - 40;

const QUOTE = 'What is the very first thing you noticed about me?';

export default function HomeScreen() {
  const router = useRouter();
  const { status, space, members, invite } = useSpace();
  const memories = useQuery(api.memories.list) ?? [];
  const allTodos = useQuery(api.todos.list);

  const upcomingTodos = (allTodos ?? []).filter((t) => !t.done).slice(0, 2);
  const isSolo = status === "solo";
  const recentMemories = memories.slice(0, 5);
  const [memoryIndex, setMemoryIndex] = useState(0);

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

        {/* Recent Memories */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Memories</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/journal")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {memories === undefined ? (
            <View style={styles.memoryCardSkeleton} />
          ) : memories.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => router.push("/new")}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyTitle}>no memories yet</Text>
              <Text style={styles.emptySubtitle}>tap to capture your first one ✨</Text>
            </TouchableOpacity>
          ) : (
            <>
              <FlatList
                data={recentMemories}
                keyExtractor={(m) => m._id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_W + 12}
                decelerationRate="fast"
                contentContainerStyle={{ gap: 12 }}
                onMomentumScrollEnd={(e) => {
                  setMemoryIndex(Math.round(e.nativeEvent.contentOffset.x / (CARD_W + 12)));
                }}
                renderItem={({ item: m }) => (
                  <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => router.push(`/memory/${m._id}`)}
                    style={styles.memoryCard}
                  >
                    <ImageBackground
                      source={m.firstPhotoUrl ? { uri: m.firstPhotoUrl } : undefined}
                      style={styles.memoryCardBg}
                      imageStyle={styles.memoryCardImg}
                    >
                      {/* gradient overlay */}
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.72)"]}
                        locations={[0.35, 1]}
                        style={styles.cardGradient}
                      />

                      {/* date badge */}
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeText}>{formatDate(m.date)}</Text>
                      </View>

                      {/* bottom content */}
                      <View style={styles.cardBottom}>
                        <View style={styles.cardBottomText}>
                          <Text style={styles.cardTitle} numberOfLines={2}>{m.title}</Text>
                          {!!(m.caption || m.body) && (
                            <Text style={styles.cardCaption} numberOfLines={2}>
                              {m.caption || m.body?.slice(0, 80)}
                            </Text>
                          )}
                        </View>
                        <MemoryHeartBtn memoryId={m._id} />
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                )}
              />

              {recentMemories.length > 1 && (
                <View style={styles.dotRow}>
                  {recentMemories.map((_, i) => (
                    <View key={i} style={[styles.dot, i === memoryIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Quote of the Day */}
        <View style={[styles.cardMt, styles.quoteCardShadow]}>
          <ImageBackground
            source={require("../../assets/daily-notes-card-bg.png")}
            style={styles.quoteCard}
            imageStyle={styles.quoteCardImg}
          >
            <Text style={styles.quoteDailyLabel}>Question of the Day</Text>
            <Text style={styles.quoteText}>{QUOTE}</Text>
          </ImageBackground>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}


function MemoryHeartBtn({ memoryId }: { memoryId: string }) {
  const data = useQuery(api.reactions.countsForMemory, { memoryId: memoryId as any });
  const toggle = useMutation(api.reactions.toggle);
  const liked = data?.liked ?? false;
  return (
    <TouchableOpacity
      style={styles.heartBtn}
      activeOpacity={0.8}
      onPress={() => toggle({ memoryId: memoryId as any })}
    >
      <Heart
        size={20}
        color={liked ? colors.coral : "#fff"}
        fill={liked ? colors.coral : "none"}
        strokeWidth={liked ? 0 : 1.8}
      />
    </TouchableOpacity>
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

  // Quote of the Day card
  quoteCardShadow: {
    borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.20, shadowRadius: 12, elevation: 8,
  },
  quoteCard: { borderRadius: 20, overflow: "hidden", padding: 20, paddingVertical: 24, minHeight: 140 },
  quoteCardImg: { borderRadius: 20, opacity: 0.75 },
  quoteDailyLabel: { fontFamily: "PatrickHand", fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 10 },
  quoteText: { fontFamily: "PatrickHand", fontSize: 20, color: "#fff", lineHeight: 28 },

  // Todo card label (shared)
  cardLabel: { fontFamily: "PatrickHand", fontSize: 13, fontWeight: "600", color: colors.brown + "CC", marginBottom: 4 },

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

  // Recent memories
  recentSection: { marginTop: 24 },
  recentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  recentTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },
  seeAll: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.coral },

  memoryCard: { width: CARD_W, borderRadius: 20, overflow: "hidden" },
  memoryCardBg: { width: CARD_W, height: 240, justifyContent: "space-between" },
  memoryCardImg: { borderRadius: 20 },

  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },

  dateBadge: {
    margin: 14,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateBadgeText: { fontFamily: "PatrickHand", fontSize: 12, fontWeight: "600", color: "#fff" },

  cardBottom: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 16, gap: 8,
  },
  cardBottomText: { flex: 1 },
  cardTitle: { fontFamily: "PatrickHand", fontSize: 22, fontWeight: "600", color: "#fff", lineHeight: 28, marginBottom: 4 },
  cardCaption: { fontFamily: "PatrickHand", fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 18 },
  heartBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },

  dotRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brown + "40" },
  dotActive: { width: 18, backgroundColor: colors.coral },

  memoryCardSkeleton: { width: CARD_W, height: 240, borderRadius: 20, backgroundColor: colors.border },

  // Empty state
  emptyCard: {
    width: CARD_W, height: 240, borderRadius: 20,
    backgroundColor: colors.paper, borderWidth: 2,
    borderColor: colors.brown + "30", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  emptyTitle: { fontFamily: "Caveat-Bold", fontSize: 22, color: colors.coral },
  emptySubtitle: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "99" },
});
