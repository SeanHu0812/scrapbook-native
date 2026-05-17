import { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Platform, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ArrowLeft, CalendarDays, ChevronRight, Bell, Palette, Globe, Bug } from "lucide-react-native";
import { useSpace } from "@/lib/useSpace";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";

function pad2(n: number) { return String(n).padStart(2, "0"); }
function dateToIso(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

function formatSettingsDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const { space, members, currentUser } = useSpace();
  const updateStartDate = useMutation(api.spaces.updateStartDate);

  const [signingOut, setSigningOut] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date>(
    space?.startDate ? new Date(space.startDate + "T00:00:00") : new Date()
  );

  const partner = members.find((m) => m.userId !== currentUser?._id);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } finally {
      setSigningOut(false);
    }
  }

  async function handleDateConfirm() {
    setDatePickerOpen(false);
    await updateStartDate({ startDate: dateToIso(pickedDate) });
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ACCOUNT */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.settingsCard}>
          <SettingsRow label="Email" trailing={
            <Text style={styles.valueChip} numberOfLines={1}>{currentUser?.email ?? "—"}</Text>
          } />
        </View>

        {/* RELATIONSHIP */}
        <Text style={styles.sectionLabel}>Your relationship</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.row} onPress={() => setDatePickerOpen(true)} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <CalendarDays size={16} color={colors.coral} strokeWidth={1.8} />
              <Text style={styles.rowLabel}>Anniversary</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>
                {space?.startDate ? formatSettingsDate(space.startDate) : (
                  <Text style={{ color: colors.coral }}>Set date</Text>
                )}
              </Text>
              <ChevronRight size={14} color={colors.brown + "60"} strokeWidth={2} />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowEmoji}>🤍</Text>
              <Text style={styles.rowLabel}>Partner</Text>
            </View>
            {partner ? (
              <Text style={styles.rowValue}>{partner.name}</Text>
            ) : (
              <TouchableOpacity onPress={() => router.push("/onboarding/invite")}>
                <Text style={styles.rowLink}>Invite your partner</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* PREFERENCES */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.settingsCard}>
          <View style={[styles.row, styles.rowDisabled]}>
            <View style={styles.rowLeft}>
              <Bell size={16} color={colors.brown + "99"} strokeWidth={1.8} />
              <Text style={[styles.rowLabel, { color: colors.brown + "99" }]}>Notifications</Text>
            </View>
            <View style={styles.toggle}>
              <View style={styles.toggleThumb} />
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={[styles.row, styles.rowDisabled]}>
            <View style={styles.rowLeft}>
              <Palette size={16} color={colors.brown + "99"} strokeWidth={1.8} />
              <Text style={[styles.rowLabel, { color: colors.brown + "99" }]}>Appearance</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.brown + "60" }]}>System</Text>
              <ChevronRight size={14} color={colors.brown + "40"} strokeWidth={2} />
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={[styles.row, styles.rowDisabled]}>
            <View style={styles.rowLeft}>
              <Globe size={16} color={colors.brown + "99"} strokeWidth={1.8} />
              <Text style={[styles.rowLabel, { color: colors.brown + "99" }]}>Language</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.brown + "60" }]}>English</Text>
              <ChevronRight size={14} color={colors.brown + "40"} strokeWidth={2} />
            </View>
          </View>
        </View>

        {/* SUPPORT */}
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <Bug size={16} color={colors.brown + "99"} strokeWidth={1.8} />
              <Text style={styles.rowLabel}>Report a bug</Text>
            </View>
            <ChevronRight size={14} color={colors.brown + "60"} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.7}
        >
          {signingOut
            ? <ActivityIndicator color="#EF4444" size="small" />
            : <Text style={styles.signOutText}>Sign out</Text>
          }
        </TouchableOpacity>

        <Text style={styles.version}>Scrapbook v1.0</Text>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Anniversary date picker — iOS modal */}
      {datePickerOpen && Platform.OS === "ios" && (
        <Modal transparent animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setDatePickerOpen(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Anniversary</Text>
                <TouchableOpacity onPress={handleDateConfirm}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickedDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, d) => d && setPickedDate(d)}
                themeVariant="light"
              />
            </View>
          </View>
        </Modal>
      )}
      {datePickerOpen && Platform.OS === "android" && (
        <DateTimePicker
          value={pickedDate}
          mode="date"
          maximumDate={new Date()}
          onChange={async (_, d) => {
            setDatePickerOpen(false);
            if (d) {
              setPickedDate(d);
              await updateStartDate({ startDate: dateToIso(d) });
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

function SettingsRow({ label, trailing }: { label: string; trailing?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border + "60",
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },

  sectionLabel: {
    fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.brown + "CC",
    marginTop: 20, marginBottom: 8,
  },
  settingsCard: {
    backgroundColor: "#fff", borderRadius: 20, overflow: "hidden",
    ...(shadows.paper as object),
  },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowDisabled: { opacity: 0.6 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowEmoji: { fontSize: 16, width: 16, textAlign: "center" },
  rowLabel: { fontFamily: "PatrickHand", fontSize: 14, color: colors.ink },
  rowValue: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "CC" },
  rowLink: { fontFamily: "PatrickHand", fontSize: 13, color: colors.coral, textDecorationLine: "underline" },
  rowDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },

  valueChip: {
    backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border,
    borderRadius: 32, paddingHorizontal: 12, paddingVertical: 4,
    fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "B3",
    maxWidth: 180,
  },

  toggle: {
    width: 40, height: 24, borderRadius: 12, backgroundColor: colors.border,
  },
  toggleThumb: {
    position: "absolute", left: 2, top: 2, width: 20, height: 20,
    borderRadius: 10, backgroundColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
  },

  signOutBtn: { marginTop: 28, alignItems: "center", paddingVertical: 8 },
  signOutText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#EF4444" },

  version: {
    fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "60",
    textAlign: "center", marginTop: 8,
  },

  pickerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" },
  pickerSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  pickerHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerCancel: { fontFamily: "PatrickHand", fontSize: 15, color: colors.brown },
  pickerTitle: { fontFamily: "PatrickHand", fontSize: 16, fontWeight: "600", color: colors.ink },
  pickerDone: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.coral },
});
