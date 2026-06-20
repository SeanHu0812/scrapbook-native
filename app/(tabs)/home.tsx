import {
  View, Text, ScrollView, TouchableOpacity, Image, FlatList,
  StyleSheet, Dimensions, ImageBackground, Modal, Animated, PanResponder,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bell, ChevronRight, Flag, Heart, BookOpen, CheckSquare, Trash2 } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { useState, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useSpace } from "@/lib/useSpace";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { InvitePartnerCard } from "@/components/ui/InvitePartnerCard";
import { colors } from "@/theme/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_W = SCREEN_W - 40;

const CATEGORY_DOODLE: Record<string, ReturnType<typeof require>> = {
  default: require("../../assets/beach-doodle.png"),
};

const QUOTE = 'What is the very first thing you noticed about me?';

export default function HomeScreen() {
  const router = useRouter();
  const { status, space, members, invite, currentUser } = useSpace();
  const memories = useQuery(api.memories.list) ?? [];
  const allTodos = useQuery(api.todos.list);
  const recentNotes = useQuery(api.notes.list)?.slice(0, 2) ?? [];
  const removeNote = useMutation(api.notes.remove);

  const sortedTodos = [...(allTodos ?? [])].sort((a, b) => {
    const aDone = a.status === "done";
    const bDone = b.status === "done";
    if (aDone !== bDone) return aDone ? 1 : -1;
    const aOrder = (a as any).sortOrder ?? a.createdAt ?? 0;
    const bOrder = (b as any).sortOrder ?? b.createdAt ?? 0;
    return aOrder - bOrder;
  });
  const firstTodo = sortedTodos[0];
  const isSolo = status === "solo";
  const recentMemories = memories.slice(0, 5);
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [notifVisible, setNotifVisible] = useState(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);

  function handleScrollLock(locked: boolean) {
    setScrollLocked(locked);
    if (locked) {
      // Snap to current position to kill any scroll momentum
      scrollRef.current?.scrollTo({ y: scrollYRef.current, animated: false });
    }
  }

  // Build activity feed from memories + todos
  const memberMap = Object.fromEntries(members.map((m) => [m.userId, m]));
  type Activity = { id: string; type: "memory" | "todo"; title: string; actorId: string; ts: number };
  const activities: Activity[] = [
    ...(memories ?? []).map((m) => ({
      id: m._id,
      type: "memory" as const,
      title: m.title,
      actorId: (m as any).authorId ?? "",
      ts: new Date((m as any).date ?? 0).getTime(),
    })),
    ...(allTodos ?? []).map((t) => ({
      id: t._id,
      type: "todo" as const,
      title: t.title,
      actorId: (t as any).createdBy ?? "",
      ts: (t as any).createdAt ?? 0,
    })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 30);

  const headerTitle = members.length >= 2
    ? `${members[0].name.split(" ")[0]} & ${members[1].name.split(" ")[0]}'s Story`
    : members.length === 1
      ? `${members[0].name.split(" ")[0]}'s Story`
      : "Our Story";

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!scrollLocked}
        scrollEventThrottle={16}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <TouchableOpacity style={styles.bellBtn} onPress={() => setNotifVisible(true)}>
            <Bell size={20} color={colors.ink} strokeWidth={1.8} />
            {activities.length > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroAvatarRow}>
            <View style={styles.heroAvatarWrap}>
              {members[0] ? (
                <UserAvatar
                  name={members[0].name}
                  avatarPreset={members[0].avatarPreset}
                  avatarUrl={members[0].avatarUrl}
                  size={100}
                />
              ) : (
                <View style={[styles.heroAvatarPlaceholder]} />
              )}
            </View>

            <View style={styles.heroHeartWrap}>
              <Heart size={18} color={colors.coral} fill={colors.coral} strokeWidth={0} />
            </View>

            <View style={styles.heroAvatarWrap}>
              {members.length > 1 ? (
                <UserAvatar
                  name={members[1].name}
                  avatarPreset={members[1].avatarPreset}
                  avatarUrl={members[1].avatarUrl}
                  size={100}
                />
              ) : (
                <TouchableOpacity
                  style={styles.heroAvatarPlaceholder}
                  onPress={() => router.push("/onboarding/invite")}
                >
                  <Text style={styles.heroAvatarPlus}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

        </View>

        {/* Invite card — solo only */}
        {isSolo && invite && <InvitePartnerCard code={invite.code} />}

        {/* Notes */}
        {recentNotes.length > 0 && (
          <View style={styles.notesSection}>
            <Text style={styles.notesSectionTitle}>Notes</Text>
            {recentNotes.map((note) => {
              const author = memberMap[(note as any).authorId];
              const isAuthor = currentUser?._id === (note as any).authorId;
              return (
                <DraggableNoteCard
                  key={note._id as string}
                  note={note as any}
                  author={author}
                  isAuthor={isAuthor}
                  removeNote={removeNote}
                  onScrollLock={handleScrollLock}
                />
              );
            })}
          </View>
        )}

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

        {/* Next Adventure */}
        <View style={styles.cardMtSmall}>
          <View style={styles.adventureHeader}>
            <View style={styles.adventureHeaderLeft}>
              <Flag size={16} color={colors.coral} strokeWidth={1.8} />
              <Text style={styles.adventureSectionTitle}>Next Adventure</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/todos")} style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>View all</Text>
              <ChevronRight size={14} color={colors.coral} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          {firstTodo ? (
            <TouchableOpacity
              style={styles.adventureCard}
              onPress={() => router.push("/todos")}
              activeOpacity={0.9}
            >
              <View style={styles.adventureContent}>
                <Text style={styles.adventureItemTitle} numberOfLines={2}>{firstTodo.title}</Text>
                {!!firstTodo.due && (
                  <Text style={styles.adventureSubtitle}>{firstTodo.due}</Text>
                )}
                {firstTodo.status && (
                  <View style={[styles.adventureBadge, firstTodo.status === "planned" && styles.adventureBadgePlanned, firstTodo.status === "done" && styles.adventureBadgeDone]}>
                    <Text style={[styles.adventureBadgeText, firstTodo.status === "planned" && styles.adventureBadgePlannedText, firstTodo.status === "done" && styles.adventureBadgeDoneText]}>
                      {firstTodo.status.charAt(0).toUpperCase() + firstTodo.status.slice(1)}
                    </Text>
                  </View>
                )}
              </View>

              <Image
                source={CATEGORY_DOODLE[(firstTodo as any).category] ?? CATEGORY_DOODLE.default}
                style={styles.adventureDoodle}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.adventureEmpty}
              onPress={() => router.push("/todos")}
              activeOpacity={0.85}
            >
              <Text style={styles.adventureEmptyText}>No adventures planned yet</Text>
              <Text style={styles.adventureEmptySubtext}>Tap to add your first one ✈️</Text>
            </TouchableOpacity>
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

      {/* Notification sheet */}
      <Modal visible={notifVisible} transparent animationType="slide" onRequestClose={() => setNotifVisible(false)}>
        <TouchableOpacity style={styles.notifOverlay} activeOpacity={1} onPress={() => setNotifVisible(false)} />
        <SafeAreaView style={styles.notifSheet} edges={["bottom"]}>
          <View style={styles.notifHandle} />
          <Text style={styles.notifTitle}>Recent Activity</Text>
          <FlatList
            data={activities}
            keyExtractor={(a) => a.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notifList}
            ItemSeparatorComponent={() => <View style={styles.notifSep} />}
            ListEmptyComponent={
              <View style={styles.notifEmpty}>
                <Text style={styles.notifEmptyText}>No activity yet</Text>
              </View>
            }
            renderItem={({ item }) => {
              const actor = memberMap[item.actorId];
              return (
                <View style={styles.notifItem}>
                  <View style={styles.notifIconWrap}>
                    {item.type === "memory"
                      ? <BookOpen size={16} color={colors.coral} strokeWidth={1.8} />
                      : <CheckSquare size={16} color="#4CAF7D" strokeWidth={1.8} />
                    }
                  </View>
                  <View style={styles.notifItemText}>
                    <Text style={styles.notifItemTitle} numberOfLines={1}>
                      <Text style={styles.notifActor}>{actor?.name.split(" ")[0] ?? "Someone"} </Text>
                      {item.type === "memory" ? "added a memory" : "added to the list"}
                    </Text>
                    <Text style={styles.notifItemSub} numberOfLines={1}>{item.title}</Text>
                  </View>
                  <Text style={styles.notifTime}>{relativeTime(item.ts)}</Text>
                </View>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
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

type NoteRow = {
  _id: string;
  body: string;
  authorId: string;
  createdAt: number;
  expiresAt?: number;
};

type MemberRow = { userId: string; name: string; avatarPreset?: string; avatarUrl?: string };

function DraggableNoteCard({
  note, author, isAuthor, removeNote, onScrollLock,
}: {
  note: NoteRow;
  author: MemberRow | undefined;
  isAuthor: boolean;
  removeNote: (args: { id: any }) => Promise<any>;
  onScrollLock: (locked: boolean) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [trashActive, setTrashActive] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const cardRef = useRef<View>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const overTrashRef = useRef(false);
  const isDragRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trashScale = useRef(new Animated.Value(1)).current;
  const onScrollLockRef = useRef(onScrollLock);
  onScrollLockRef.current = onScrollLock;

  const TRASH_THRESHOLD = SCREEN_H - 200;

  const panResponder = useRef(
    PanResponder.create({
      // Capture the touch immediately so we own it before the Modal opens
      onStartShouldSetPanResponder: () => isAuthor,
      onPanResponderGrant: () => {
        onScrollLockRef.current(true);
        // Measure now while finger is still down
        (cardRef.current as any)?.measure((_: any, __: any, _w: any, _h: any, px: number, py: number) => {
          originRef.current = { x: px, y: py };
        });
        longPressTimer.current = setTimeout(() => {
          isDragRef.current = true;
          pan.setValue({ x: 0, y: 0 });
          setDragging(true);
        }, 400);
      },
      onPanResponderMove: (_, g) => {
        if (!isDragRef.current) return;
        pan.setValue({ x: g.dx, y: g.dy });
        const absY = originRef.current.y + g.dy;
        const over = absY + 56 > TRASH_THRESHOLD;
        if (over !== overTrashRef.current) {
          overTrashRef.current = over;
          setTrashActive(over);
          Animated.spring(trashScale, { toValue: over ? 1.4 : 1, useNativeDriver: false }).start();
        }
      },
      onPanResponderRelease: (_, g) => {
        onScrollLockRef.current(false);
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (!isDragRef.current) return; // short tap — ignore
        isDragRef.current = false;
        overTrashRef.current = false;
        setDragging(false);
        setTrashActive(false);
        pan.setValue({ x: 0, y: 0 });
        trashScale.setValue(1);
        const absY = originRef.current.y + g.dy;
        if (absY + 56 > TRASH_THRESHOLD) {
          removeNote({ id: note._id as any });
        }
      },
      onPanResponderTerminate: () => {
        onScrollLockRef.current(false);
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        isDragRef.current = false;
        overTrashRef.current = false;
        setDragging(false);
        setTrashActive(false);
        pan.setValue({ x: 0, y: 0 });
        trashScale.setValue(1);
      },
    })
  ).current;

  const cardContent = (
    <>
      <View style={styles.noteCardLeft}>
        {author && (
          <UserAvatar name={author.name} avatarPreset={author.avatarPreset} avatarUrl={author.avatarUrl} size={32} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.noteCardBody} numberOfLines={2}>{note.body}</Text>
      </View>
      <Text style={styles.noteCardTime}>{relativeTime(note.createdAt)}</Text>
    </>
  );

  return (
    <>
      {/* panHandlers on the original card so the gesture is continuous from long-press */}
      <View ref={cardRef} {...panResponder.panHandlers}>
        <View style={[styles.noteCard, dragging && { opacity: 0.3 }]}>
          {cardContent}
        </View>
      </View>

      {dragging && (
        <Modal transparent animationType="none" onRequestClose={() => {}}>
          {/* pointerEvents="none" — purely visual; the original card still owns the touch */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.3)" }]} />

            <Animated.View
              style={[styles.noteCard, styles.noteCardFloating, {
                top: originRef.current.y,
                transform: pan.getTranslateTransform(),
              }]}
            >
              {cardContent}
            </Animated.View>

            <View style={styles.trashZone}>
              <Animated.View style={[styles.trashCircle, { backgroundColor: trashActive ? "#E55E5E" : "#B0A8A0", transform: [{ scale: trashScale }] }]}>
                <Trash2 size={24} color="#fff" strokeWidth={1.8} />
              </Animated.View>
              <Text style={styles.trashLabel}>drop to delete</Text>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getRelationshipDuration(startDate: string): string {
  const start = new Date(startDate);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(", ") : "just started";
}

function formatStartDate(dateStr: string): string {
  const [year, m, d] = dateStr.split("-").map(Number);
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${MONTHS[m - 1]} ${d}, ${year}`;
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
  content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 4, paddingTop: 12, paddingBottom: 4,
  },
  headerTitle: { fontFamily: "Caveat-Bold", fontSize: 22, color: colors.ink, flex: 1 },
  bellBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  bellDot: {
    position: "absolute", top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.coral, borderWidth: 1.5, borderColor: colors.cream,
  },

  // Notification sheet
  notifOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  notifSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: "70%",
  },
  notifHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: "center", marginBottom: 16,
  },
  notifTitle: { fontFamily: "Caveat-Bold", fontSize: 24, color: colors.ink, marginBottom: 12 },
  notifList: { paddingBottom: 24 },
  notifSep: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  notifItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  notifIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.paper,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  notifItemText: { flex: 1 },
  notifItemTitle: { fontFamily: "PatrickHand", fontSize: 14, color: colors.ink },
  notifActor: { fontWeight: "700", color: colors.brown },
  notifItemSub: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "99", marginTop: 1 },
  notifTime: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "66", flexShrink: 0 },
  notifEmpty: { paddingVertical: 40, alignItems: "center" },
  notifEmptyText: { fontFamily: "PatrickHand", fontSize: 15, color: colors.brown + "80" },

  // Hero
  hero: { alignItems: "center", paddingTop: 16, paddingBottom: 8 },
  heroAvatarRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 0 },
  heroAvatarWrap: {
    width: 110, height: 110, borderRadius: 55,
    overflow: "hidden",
    borderWidth: 3, borderColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10, shadowRadius: 10, elevation: 4,
  },
  heroAvatarPlaceholder: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: colors.paper,
    borderWidth: 2, borderColor: colors.border, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  heroAvatarPlus: { fontSize: 32, color: colors.brown + "66" },
  heroHeartWrap: {
    zIndex: 1, marginHorizontal: -6,
    backgroundColor: "#fff", borderRadius: 14,
    padding: 5,
    shadowColor: colors.coral, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20, shadowRadius: 4, elevation: 3,
  },
  heroDuration: { alignItems: "center", marginTop: 20, gap: 4 },
  heroDurationLabel: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "99" },
  heroDurationValue: { fontFamily: "Caveat-Bold", fontSize: 32, color: colors.ink, lineHeight: 36 },
  heroDurationSince: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "99" },


  // Notes section
  notesSection: { marginTop: 16, gap: 8 },
  notesSectionTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink, marginBottom: 2 },
  noteCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  noteCardLeft: { flexShrink: 0 },
  noteCardBody: { fontFamily: "PatrickHand", fontSize: 15, color: colors.ink, lineHeight: 20 },
  noteCardTime: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "80", flexShrink: 0 },
  noteCardFloating: {
    position: "absolute", left: 20, right: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 12,
  },
  trashZone: {
    position: "absolute", bottom: 130,
    alignSelf: "center", alignItems: "center", gap: 6,
  },
  trashCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
  },
  trashLabel: {
    fontFamily: "PatrickHand", fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },

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


  // Next Adventure
  adventureHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  adventureHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  adventureSectionTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewAllText: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.coral },

  adventureCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: colors.cream, borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 8,
  },
  adventureContent: { flex: 1, gap: 4 },
  adventureItemTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink, lineHeight: 24 },
  adventureSubtitle: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "B3" },
  adventureBadge: {
    alignSelf: "flex-start", backgroundColor: "#EDE9F8",
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4,
  },
  adventureBadgePlanned: { backgroundColor: "#CFE8C9" },
  adventureBadgeDone: { backgroundColor: colors.coral + "22" },
  adventureBadgeText: { fontFamily: "PatrickHand", fontSize: 12, color: "#7C6CA8" },
  adventureBadgePlannedText: { color: "#3A7D58" },
  adventureBadgeDoneText: { color: colors.coral },
  adventureDoodle: { width: 72, height: 72, flexShrink: 0, opacity: 0.9 },

  adventureEmpty: {
    backgroundColor: colors.cream, borderRadius: 20, padding: 20,
    alignItems: "center", gap: 4,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed",
  },
  adventureEmptyText: { fontFamily: "PatrickHand", fontSize: 16, color: colors.ink },
  adventureEmptySubtext: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "99" },

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
