import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MapPin, Heart } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";

type Memory = NonNullable<ReturnType<typeof useQuery<typeof api.memories.list>>>[number];

function monthName(m: number) {
  return ["January","February","March","April","May","June","July","August","September","October","November","December"][m - 1];
}

function groupByMonth(memories: Memory[]) {
  const groups = new Map<string, { label: string; list: Memory[] }>();
  for (const m of memories) {
    const [y, mo] = m.date.split("-").map(Number);
    const key = `${y}-${mo}`;
    const label = `${monthName(mo)} ${y}`;
    if (!groups.has(key)) groups.set(key, { label, list: [] });
    groups.get(key)!.list.push(m);
  }
  return [...groups.values()];
}

export default function JournalScreen() {
  const router = useRouter();
  const memories = useQuery(api.memories.list);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>journal</Text>
          <Text style={styles.sparkle}>✦</Text>
        </View>
        <Text style={styles.subtitle}>Every little moment, kept together.</Text>

        {/* Loading */}
        {memories === undefined ? (
          <View style={styles.skeletonList}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonRow}>
                  <View style={[styles.skeletonLine, { width: 96 }]} />
                  <View style={[styles.skeletonLine, { width: 64 }]} />
                </View>
                <View style={styles.skeletonBody}>
                  <View style={styles.skeletonPhoto} />
                  <View style={styles.skeletonTextCol}>
                    <View style={[styles.skeletonLine, { width: "75%" as any }]} />
                    <View style={[styles.skeletonLine, { width: "100%" as any }]} />
                    <View style={[styles.skeletonLine, { width: "60%" as any }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>

        ) : memories.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>no memories yet</Text>
            <Text style={styles.emptySubtitle}>start collecting your little moments</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/new")}>
              <Text style={styles.emptyBtnText}>Add first memory</Text>
            </TouchableOpacity>
          </View>

        ) : (
          <View style={styles.groupList}>
            {groupByMonth(memories).map(({ label, list }) => (
              <View key={label} style={styles.group}>

                {/* Month header */}
                <View style={styles.groupHeader}>
                  <Text style={styles.groupLabel}>{label}</Text>
                  <View style={styles.groupDivider} />
                  <Text style={styles.groupCount}>
                    {list.length} memor{list.length === 1 ? "y" : "ies"}
                  </Text>
                </View>

                {/* Cards */}
                <View style={styles.cardList}>
                  {list.map((m, i) => {
                    const isOdd = i % 2 === 1;
                    const tapeColor = isOdd ? colors.pinkSoft : colors.yellowSoft;
                    const photoRotate = isOdd ? "3deg" : "-3deg";

                    return (
                      <TouchableOpacity
                        key={m._id}
                        activeOpacity={0.9}
                        onPress={() => router.push(`/memory/${m._id}`)}
                      >
                        <View style={styles.card}>
                          {/* Tape */}
                          <View style={[
                            styles.tape,
                            { backgroundColor: tapeColor },
                            isOdd ? styles.tapeRight : styles.tapeLeft,
                          ]} />

                          {/* Date row */}
                          <View style={styles.cardDateRow}>
                            <Text style={styles.cardDate}>
                              {monthName(Number(m.date.split("-")[1]))} {Number(m.date.split("-")[2])}
                            </Text>
                            <Text style={styles.cardWeekday}>{m.weekday} ☀️</Text>
                          </View>

                          {/* Body */}
                          <View style={styles.cardBody}>
                            <View style={[styles.polaroidWrap, { transform: [{ rotate: photoRotate }] }]}>
                              {m.firstPhotoUrl ? (
                                <Image source={{ uri: m.firstPhotoUrl }} style={styles.polaroidImg} />
                              ) : (
                                <View style={[styles.polaroidImg, styles.polaroidPlaceholder]}>
                                  <Text style={styles.polaroidEmoji}>📷</Text>
                                </View>
                              )}
                            </View>

                            <View style={styles.cardText}>
                              <Text style={styles.cardTitle} numberOfLines={2}>{m.title}</Text>
                              {!!m.body && (
                                <Text style={styles.cardBodyText} numberOfLines={2}>{m.body}</Text>
                              )}
                              <View style={styles.cardMeta}>
                                {!!m.location && (
                                  <View style={styles.metaItem}>
                                    <MapPin size={11} color={colors.brown + "CC"} strokeWidth={1.8} />
                                    <Text style={styles.metaText} numberOfLines={1}>{m.location}</Text>
                                  </View>
                                )}
                                <View style={styles.metaItem}>
                                  <Heart size={11} color={colors.brown + "CC"} strokeWidth={1.8} />
                                  <Text style={styles.metaText}>0</Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  title: { fontFamily: "Caveat-Bold", fontSize: 32, color: colors.ink },
  sparkle: { fontSize: 20, color: colors.yellow },
  subtitle: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "CC", marginBottom: 20 },

  skeletonList: { gap: 16 },
  skeletonCard: { backgroundColor: "#fff", borderRadius: 24, padding: 16, ...(shadows.card as object) },
  skeletonRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  skeletonLine: { height: 13, backgroundColor: colors.border, borderRadius: 8 },
  skeletonBody: { flexDirection: "row", gap: 12 },
  skeletonPhoto: { width: 100, height: 100, borderRadius: 16, backgroundColor: colors.border },
  skeletonTextCol: { flex: 1, gap: 8, paddingTop: 4 },

  empty: { marginTop: 64, alignItems: "center", gap: 8 },
  emptyTitle: { fontFamily: "Caveat-Bold", fontSize: 26, color: colors.coral },
  emptySubtitle: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "99", marginBottom: 8 },
  emptyBtn: { backgroundColor: colors.coral, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#fff" },

  groupList: { gap: 28 },
  group: { gap: 12 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupLabel: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.brown },
  groupDivider: { flex: 1, height: 1, backgroundColor: colors.border },
  groupCount: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "B3" },

  cardList: { gap: 16 },
  card: {
    backgroundColor: "#fff", borderRadius: 24, padding: 16, paddingTop: 20,
    overflow: "hidden", ...(shadows.card as object),
  },

  tape: { position: "absolute", top: 0, width: 48, height: 14, borderRadius: 3, opacity: 0.9 },
  tapeLeft: { left: 24 },
  tapeRight: { right: 24 },

  cardDateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardDate: { fontFamily: "PatrickHand", fontSize: 13, fontWeight: "600", color: colors.ink },
  cardWeekday: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "CC" },

  cardBody: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  polaroidWrap: {
    backgroundColor: "#fff", padding: 5, paddingBottom: 14, borderRadius: 4, flexShrink: 0,
    shadowColor: "#6C5A4E", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4,
  },
  polaroidImg: { width: 88, height: 88, borderRadius: 2, backgroundColor: colors.blueSoft },
  polaroidPlaceholder: { alignItems: "center", justifyContent: "center" },
  polaroidEmoji: { fontSize: 28 },

  cardText: { flex: 1, gap: 4 },
  cardTitle: { fontFamily: "PatrickHand", fontSize: 17, fontWeight: "600", color: colors.ink, lineHeight: 22 },
  cardBodyText: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown, lineHeight: 18 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontFamily: "PatrickHand", fontSize: 11, color: colors.brown + "CC" },
});
