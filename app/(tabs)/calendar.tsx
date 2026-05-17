import { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Image, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["S","M","T","W","T","F","S"];
const CELL_SIZE = (Dimensions.get("window").width - 40) / 7;

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function pad2(n: number) { return String(n).padStart(2, "0"); }

export default function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(today.getDate());

  const memories = useQuery(api.memories.list) ?? [];
  const memoryByDate = new Map(memories.map((m) => [m.date, m]));

  const selectedDate = `${year}-${pad2(month + 1)}-${pad2(selected)}`;
  const selectedMemory = memoryByDate.get(selectedDate) ?? null;

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(1);
  }

  const totalDays = daysInMonth(year, month);
  const startPad = firstDayOfWeek(year, month);

  // Build cell array: null = padding, number = day
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>

        {/* Month switcher */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={prevMonth} style={styles.chevronBtn}>
            <ChevronLeft size={20} color={colors.brown} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.chevronBtn}>
            <ChevronRight size={20} color={colors.brown} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.sprout}>🌱</Text>
        </View>

        {/* Day-of-week header */}
        <View style={styles.dowRow}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={[styles.dowLabel, { width: CELL_SIZE }]}>{d}</Text>
          ))}
        </View>

        {/* Day grid */}
        <View style={styles.grid}>
          {cells.map((day, idx) => {
            if (day === null) {
              return <View key={`pad-${idx}`} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
            }
            const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
            const hasMemory = memoryByDate.has(dateStr);
            const isSelected = day === selected;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayCell, { width: CELL_SIZE, height: CELL_SIZE }]}
                onPress={() => setSelected(day)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.dayInner,
                  isSelected && styles.daySelected,
                  !isSelected && isToday && styles.dayToday,
                ]}>
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    !isSelected && isToday && styles.dayTextToday,
                  ]}>
                    {day}
                  </Text>
                </View>
                {hasMemory && !isSelected && (
                  <View style={styles.memoryDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day preview card */}
        <View style={styles.previewCard}>
          {/* Tape strip */}
          <View style={styles.tape} />

          <View style={styles.previewHeader}>
            <Text style={styles.previewDate}>
              {MONTH_NAMES[month]} {selected}, {year}
            </Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push(`/new?prefillDate=${selectedDate}`)}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {selectedMemory ? (
            <View style={styles.previewPhoto}>
              {selectedMemory.firstPhotoUrl ? (
                <Image
                  source={{ uri: selectedMemory.firstPhotoUrl }}
                  style={styles.previewImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.previewImgPlaceholder}>
                  <Text style={styles.previewImgEmoji}>📷</Text>
                  <Text style={styles.previewImgTitle} numberOfLines={1}>
                    {selectedMemory.title}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noMemoryText}>
              No memory on this day yet — tap + to add one.
            </Text>
          )}
        </View>

        {/* View memory button */}
        {selectedMemory && (
          <TouchableOpacity
            style={styles.viewMemoryBtn}
            onPress={() => router.push(`/memory/${selectedMemory._id}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.viewMemoryBtnText}>View memory</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },

  header: { alignItems: "center", paddingVertical: 10 },
  headerTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },

  monthRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 16, marginTop: 8, marginBottom: 20, position: "relative",
  },
  chevronBtn: { padding: 4 },
  monthLabel: { fontFamily: "Caveat-Bold", fontSize: 28, color: colors.ink, minWidth: 160, textAlign: "center" },
  sprout: { position: "absolute", right: 0, fontSize: 22 },

  dowRow: { flexDirection: "row", marginBottom: 4 },
  dowLabel: {
    fontFamily: "PatrickHand", fontSize: 12, fontWeight: "600",
    color: colors.brown + "B3", textAlign: "center",
  },

  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 24 },
  dayCell: { alignItems: "center", justifyContent: "center" },
  dayInner: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  daySelected: {
    backgroundColor: colors.pink,
    shadowColor: colors.pink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
  },
  dayToday: { borderWidth: 1.5, borderColor: colors.coral + "80" },
  dayText: { fontFamily: "PatrickHand", fontSize: 14, color: colors.ink },
  dayTextSelected: { color: "#fff", fontWeight: "600" },
  dayTextToday: { color: colors.coral },
  memoryDot: {
    position: "absolute", bottom: 3, width: 4, height: 4,
    borderRadius: 2, backgroundColor: colors.coral,
  },

  previewCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 16, paddingTop: 20,
    overflow: "hidden", ...(shadows.card as object),
  },
  tape: {
    position: "absolute", top: 0, left: 24, width: 48, height: 14,
    backgroundColor: colors.yellowSoft, borderRadius: 3, opacity: 0.9,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  previewDate: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.ink },
  addBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.pink,
    alignItems: "center", justifyContent: "center",
    shadowColor: colors.pink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8,
  },
  addBtnText: { fontSize: 20, color: "#fff", lineHeight: 24 },

  previewPhoto: { borderRadius: 16, overflow: "hidden" },
  previewImg: { width: "100%", height: 120, borderRadius: 16 },
  previewImgPlaceholder: {
    height: 120, borderRadius: 16, backgroundColor: colors.paper,
    alignItems: "center", justifyContent: "center", gap: 8,
  },
  previewImgEmoji: { fontSize: 32 },
  previewImgTitle: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown, paddingHorizontal: 16 },

  noMemoryText: {
    fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "B3", lineHeight: 20,
  },

  viewMemoryBtn: {
    marginTop: 12, backgroundColor: colors.pink, borderRadius: 32,
    paddingVertical: 14, alignItems: "center",
    shadowColor: colors.pink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 6,
  },
  viewMemoryBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#fff" },
});
