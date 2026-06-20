import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PenLine } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { useState } from "react";

type Memory = NonNullable<ReturnType<typeof useQuery<typeof api.memories.list>>>[number];
type Note   = NonNullable<ReturnType<typeof useQuery<typeof api.notes.list>>>[number];
type Diary  = NonNullable<ReturnType<typeof useQuery<typeof api.diaries.list>>>[number];

type JournalItem =
  | { kind: "memory"; data: Memory; ts: number }
  | { kind: "note";   data: Note;   ts: number }
  | { kind: "diary";  data: Diary;  ts: number };

const FILTERS = [
  { key: "all",      label: "All" },
  { key: "memories", label: "Memories" },
  { key: "notes",    label: "Notes" },
  { key: "diary",    label: "Diary" },
] as const;

type FilterKey = typeof FILTERS[number]["key"];

function formatItemDate(ts: number): string {
  const d = new Date(ts);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function JournalScreen() {
  const router = useRouter();
  const memories = useQuery(api.memories.list);
  const notes    = useQuery(api.notes.listAll);
  const diaries  = useQuery(api.diaries.list);
  const [filter, setFilter] = useState<FilterKey>("all");

  const isLoading = memories === undefined || notes === undefined || diaries === undefined;

  const allItems: JournalItem[] = isLoading ? [] : [
    ...(memories ?? []).map((m): JournalItem => ({
      kind: "memory", data: m,
      ts: new Date((m as any).date ?? 0).getTime(),
    })),
    ...(notes ?? []).map((n): JournalItem => ({
      kind: "note", data: n,
      ts: (n as any).createdAt ?? 0,
    })),
    ...(diaries ?? []).map((d): JournalItem => ({
      kind: "diary", data: d,
      ts: (d as any).createdAt ?? 0,
    })),
  ].sort((a, b) => b.ts - a.ts);

  const kindMap: Record<string, string> = { memories: "memory", notes: "note", diary: "diary" };
  const items = filter === "all" ? allItems : allItems.filter((i) => i.kind === kindMap[filter]);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Our Timeline</Text>
        <TouchableOpacity style={styles.writeBtn} onPress={() => router.push("/new-diary")}>
          <PenLine size={22} color={colors.brown} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, filter === f.key && styles.filterPillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Timeline */}
      <ScrollView
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            {[0,1,2].map((i) => (
              <View key={i} style={styles.skeletonItem}>
                <View style={styles.skeletonDot} />
                <View style={styles.skeletonLines}>
                  <View style={[styles.skeletonLine, { width: 80 }]} />
                  <View style={[styles.skeletonLine, { width: "70%" as any, height: 16 }]} />
                  <View style={[styles.skeletonLine, { width: "90%" as any }]} />
                </View>
              </View>
            ))}
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>
              {filter === "diary"
                ? "Tap Write to start a diary entry"
                : filter === "notes"
                ? "Leave a quick note for your partner"
                : "Start capturing your little moments"}
            </Text>
            {filter === "diary" && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/new-diary")}>
                <Text style={styles.emptyBtnText}>Write first entry</Text>
              </TouchableOpacity>
            )}
            {filter === "memories" && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/new")}>
                <Text style={styles.emptyBtnText}>Add first memory</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          items.map((item, i) => (
            <TimelineRow
              key={`${item.kind}-${(item.data as any)._id}`}
              item={item}
              isLast={i === items.length - 1}
              router={router}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineRow({
  item, isLast, router,
}: {
  item: JournalItem;
  isLast: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const dotColor =
    item.kind === "memory" ? colors.coral :
    item.kind === "note"   ? "#E8C84A" :
    colors.brown;

  return (
    <View style={styles.timelineRow}>
      {/* Left: dot + line */}
      <View style={styles.tlLeft}>
        <View style={[styles.tlDot, { backgroundColor: dotColor }]} />
        {!isLast && <View style={styles.tlLine} />}
      </View>

      {/* Right: content */}
      <View style={styles.tlRight}>
        <Text style={styles.tlDate}>{formatItemDate(item.ts)}</Text>

        {item.kind === "memory" && <MemoryCard m={item.data} router={router} />}
        {item.kind === "note"   && <NotePostIt note={item.data} />}
        {item.kind === "diary"  && <DiaryCard diary={item.data} />}
      </View>
    </View>
  );
}

function MemoryCard({ m, router }: { m: Memory; router: ReturnType<typeof useRouter> }) {
  return (
    <TouchableOpacity
      onPress={() => router.push(`/memory/${m._id}`)}
      activeOpacity={0.85}
      style={styles.memWrap}
    >
      <Text style={styles.memTitle} numberOfLines={2}>{m.title}</Text>
      {m.firstPhotoUrl ? (
        <Image source={{ uri: m.firstPhotoUrl }} style={styles.memPhoto} resizeMode="cover" />
      ) : null}
      {!!(m.caption || m.body) && (
        <Text style={styles.memCaption} numberOfLines={2}>{m.caption || m.body}</Text>
      )}
    </TouchableOpacity>
  );
}

function NotePostIt({ note }: { note: Note }) {
  return (
    <View style={styles.postIt}>
      <Text style={styles.postItText}>{note.body}</Text>
    </View>
  );
}

function DiaryCard({ diary }: { diary: Diary }) {
  return (
    <View style={styles.diaryWrap}>
      {diary.title ? (
        <Text style={styles.diaryTitle}>{diary.title}</Text>
      ) : null}
      <Text style={styles.diaryBody} numberOfLines={5}>{diary.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  title: { fontFamily: "Caveat-Bold", fontSize: 28, color: colors.ink },
  writeBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1, borderColor: colors.border,
  },

  filterScroll: { flexGrow: 0, marginTop: 12 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 100, backgroundColor: "#fff",
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  filterPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterPillText: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown },
  filterPillTextActive: { color: "#fff" },

  timelineContent: { paddingHorizontal: 20, paddingTop: 20 },

  timelineRow: { flexDirection: "row", gap: 14 },

  tlLeft: { width: 20, alignItems: "center", paddingTop: 3 },
  tlDot: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: colors.cream,
    flexShrink: 0,
  },
  tlLine: { flex: 1, width: 1.5, backgroundColor: colors.border, marginTop: 6, marginBottom: -6 },

  tlRight: { flex: 1, paddingBottom: 28 },
  tlDate: {
    fontFamily: "PatrickHand", fontSize: 12,
    color: colors.brown + "80", marginBottom: 6,
  },

  // Memory
  memWrap: { gap: 6 },
  memTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink, lineHeight: 24 },
  memPhoto: {
    width: "100%", height: 160, borderRadius: 14,
    backgroundColor: colors.border,
  },
  memCaption: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown, lineHeight: 20 },

  // Note post-it
  postIt: {
    backgroundColor: "#FFF9C0",
    borderRadius: 3,
    paddingVertical: 12, paddingHorizontal: 14,
    alignSelf: "flex-start",
    maxWidth: 240,
    transform: [{ rotate: "-1.5deg" }],
    shadowColor: "#000", shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 4, elevation: 2,
    gap: 4,
  },
  postItText: {
    fontFamily: "PatrickHand", fontSize: 15,
    color: colors.ink, lineHeight: 22, fontStyle: "italic",
  },
  postItExpiry: {
    fontFamily: "PatrickHand", fontSize: 11,
    color: colors.coral + "CC",
  },

  // Diary
  diaryWrap: { gap: 4 },
  diaryTitle: {
    fontFamily: "PatrickHand", fontSize: 17, fontWeight: "600",
    color: colors.ink, lineHeight: 22,
  },
  diaryBody: {
    fontFamily: "PatrickHand", fontSize: 14,
    color: colors.brown, lineHeight: 22,
  },

  // Loading skeleton
  loadingWrap: { gap: 28 },
  skeletonItem: { flexDirection: "row", gap: 14 },
  skeletonDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border, marginTop: 3, flexShrink: 0 },
  skeletonLines: { flex: 1, gap: 8 },
  skeletonLine: { height: 12, backgroundColor: colors.border, borderRadius: 8 },

  // Empty
  empty: { marginTop: 60, alignItems: "center", gap: 8 },
  emptyTitle: { fontFamily: "Caveat-Bold", fontSize: 24, color: colors.coral },
  emptySub: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "99", marginBottom: 4, textAlign: "center" },
  emptyBtn: { backgroundColor: colors.coral, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  emptyBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#fff" },
});
