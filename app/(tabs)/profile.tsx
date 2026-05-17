import { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Modal, TextInput, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Settings, ChevronRight, X } from "lucide-react-native";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { AvatarGallery } from "@/components/ui/AvatarGallery";
import { useSpace } from "@/lib/useSpace";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";

function daysTogether(startDate: string | null | undefined): number | null {
  if (!startDate) return null;
  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[m - 1]} ${d}, ${y}`;
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function dateToIso(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

export default function ProfileScreen() {
  const router = useRouter();
  const { status, space, members, currentUser } = useSpace();
  const stats = useQuery(api.spaces.stats) ?? { memoriesCount: 0, photosCount: 0, voiceNotesCount: 0 };
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateStartDate = useMutation(api.spaces.updateStartDate);

  const isSolo = status === "solo";
  const myMember = members.find((m) => m.userId === currentUser?._id);
  const nameDisplay = members.length >= 2
    ? `${members[0].name} & ${members[1].name}`
    : members[0]?.name ?? "";

  const days = daysTogether(space?.startDate);

  // Edit profile modal
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftNickname, setDraftNickname] = useState("");
  const [draftPreset, setDraftPreset] = useState<string | null>(null);
  const [draftStorageId, setDraftStorageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openEdit() {
    setDraftName(currentUser?.name ?? "");
    setDraftNickname(currentUser?.nickname ?? "");
    setDraftPreset(currentUser?.avatarPreset ?? null);
    setDraftStorageId(null);
    setEditOpen(true);
  }

  async function saveProfile() {
    if (!draftName.trim()) return;
    setSaving(true);
    try {
      await updateProfile({
        name: draftName.trim(),
        nickname: draftNickname.trim() || undefined,
        avatarPreset: draftPreset ?? undefined,
        avatarStorageId: draftStorageId as any ?? undefined,
      });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }

  // Anniversary date picker
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date>(
    space?.startDate ? new Date(space.startDate + "T00:00:00") : new Date()
  );

  async function handleDateConfirm() {
    setDatePickerOpen(false);
    await updateStartDate({ startDate: dateToIso(pickedDate) });
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconBtn} />
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/settings")}>
            <Settings size={20} color={colors.ink} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Day counter card */}
        <View style={styles.dayCard}>
          <View style={styles.avatarRow}>
            {members[0] && (
              <UserAvatar
                name={members[0].name}
                avatarPreset={members[0].avatarPreset}
                avatarUrl={members[0].avatarUrl}
                size={68}
              />
            )}
            {members.length >= 2 && (
              <>
                <Text style={styles.heartIcon}>🤍</Text>
                <UserAvatar
                  name={members[1].name}
                  avatarPreset={members[1].avatarPreset}
                  avatarUrl={members[1].avatarUrl}
                  size={68}
                />
              </>
            )}
          </View>

          <Text style={styles.nameDisplay}>{nameDisplay}</Text>

          {days !== null ? (
            <>
              <Text style={styles.dayCount}>Day {days}</Text>
              <TouchableOpacity onPress={() => setDatePickerOpen(true)}>
                <Text style={styles.sinceLabel}>since {formatDate(space!.startDate!)} ✏️</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setDatePickerOpen(true)}>
              <Text style={styles.setAnniversaryBtn}>Set your anniversary →</Text>
            </TouchableOpacity>
          )}

          {isSolo && (
            <TouchableOpacity onPress={() => router.push("/onboarding/invite")}>
              <Text style={styles.inviteLabel}>it's just you for now — invite your partner ☁️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Edit profile row */}
        <TouchableOpacity style={styles.editRow} onPress={openEdit} activeOpacity={0.85}>
          {currentUser && (
            <UserAvatar
              name={currentUser.name}
              avatarPreset={currentUser.avatarPreset}
              avatarUrl={myMember?.avatarUrl ?? undefined}
              size={44}
            />
          )}
          <View style={styles.editRowText}>
            <Text style={styles.editRowName}>
              {currentUser?.name ?? ""}
              {currentUser?.nickname ? (
                <Text style={styles.editRowNickname}> ({currentUser.nickname})</Text>
              ) : null}
            </Text>
            <Text style={styles.editRowSub}>Your profile</Text>
          </View>
          <View style={styles.editPill}>
            <Text style={styles.editPillText}>Edit →</Text>
          </View>
        </TouchableOpacity>

        {/* Stats */}
        <Text style={styles.sectionLabel}>Our little stats</Text>
        <View style={styles.statsCard}>
          <StatBox emoji="🎀" value={stats.memoriesCount} label="Memories" tint={colors.pinkSoft} />
          <View style={styles.statDivider} />
          <StatBox emoji="🖼️" value={stats.photosCount} label="Photos" tint={colors.blueSoft} />
          <View style={styles.statDivider} />
          <StatBox emoji="🎙️" value={stats.voiceNotesCount} label="Voices" tint={colors.yellowSoft} />
        </View>

        {/* Favorites */}
        <Text style={styles.sectionLabel}>Our favorites</Text>
        <View style={styles.favCard}>
          <FavRow emoji="💝" bg={colors.pinkSoft} title="Favorite memory" sub="Coming soon" />
          <View style={styles.favDivider} />
          <FavRow emoji="📸" bg={colors.blueSoft} title="Favorite photos" sub="Coming soon" />
          <View style={styles.favDivider} />
          <FavRow emoji="🎵" bg={colors.yellowSoft} title="Song of us" sub="Coming soon" />
          <View style={styles.favDivider} />
          <FavRow emoji="📍" bg={colors.greenSoft} title="Places we love" sub="Coming soon" />
        </View>

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

      {/* Edit profile modal */}
      <Modal visible={editOpen} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit profile</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)} style={styles.closeBtn}>
                <X size={20} color={colors.ink} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Avatar</Text>
              <AvatarGallery
                selected={draftPreset}
                onSelectPreset={(preset) => { setDraftPreset(preset); setDraftStorageId(null); }}
                onUpload={(storageId) => { setDraftStorageId(storageId); setDraftPreset(null); }}
                generateUploadUrl={generateUploadUrl}
              />

              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Your name"
                placeholderTextColor={colors.brown + "80"}
              />

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Nickname (optional)</Text>
              <TextInput
                style={styles.fieldInput}
                value={draftNickname}
                onChangeText={setDraftNickname}
                placeholder="e.g. babe, love, sunshine"
                placeholderTextColor={colors.brown + "80"}
              />

              <TouchableOpacity
                style={[styles.saveBtn, (!draftName.trim() || saving) && styles.saveBtnDisabled]}
                onPress={saveProfile}
                disabled={!draftName.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>Save changes</Text>
                }
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatBox({ emoji, value, label, tint }: { emoji: string; value: number; label: string; tint: string }) {
  return (
    <View style={[styles.statBox, { backgroundColor: tint }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FavRow({ emoji, bg, title, sub }: { emoji: string; bg: string; title: string; sub: string }) {
  return (
    <TouchableOpacity style={styles.favRow} activeOpacity={0.7}>
      <View style={[styles.favIcon, { backgroundColor: bg }]}>
        <Text style={styles.favEmoji}>{emoji}</Text>
      </View>
      <View style={styles.favText}>
        <Text style={styles.favTitle}>{title}</Text>
        <Text style={styles.favSub}>{sub}</Text>
      </View>
      <ChevronRight size={16} color={colors.brown + "60"} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10,
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },

  dayCard: {
    backgroundColor: "#fff", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 24,
    alignItems: "center", marginTop: 4, ...(shadows.card as object),
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  heartIcon: { fontSize: 20 },
  nameDisplay: { fontFamily: "PatrickHand", fontSize: 20, fontWeight: "600", color: colors.ink, marginTop: 12 },
  dayCount: { fontFamily: "Caveat-Bold", fontSize: 52, color: colors.coral, lineHeight: 60, marginTop: 4 },
  sinceLabel: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "B3", marginTop: 2 },
  setAnniversaryBtn: { fontFamily: "PatrickHand", fontSize: 14, color: colors.coral, marginTop: 8, textDecorationLine: "underline" },
  inviteLabel: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "99", marginTop: 10, textAlign: "center" },

  editRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12,
    marginTop: 14, ...(shadows.paper as object),
  },
  editRowText: { flex: 1 },
  editRowName: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.ink },
  editRowNickname: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "400", color: colors.brown + "99" },
  editRowSub: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "99", marginTop: 1 },
  editPill: { backgroundColor: colors.pinkSoft, borderRadius: 32, paddingHorizontal: 12, paddingVertical: 6 },
  editPillText: { fontFamily: "PatrickHand", fontSize: 13, fontWeight: "600", color: colors.coral },

  sectionLabel: {
    fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.brown + "CC",
    marginTop: 20, marginBottom: 8,
  },
  statsCard: {
    flexDirection: "row", backgroundColor: "#fff", borderRadius: 24,
    overflow: "hidden", ...(shadows.card as object),
  },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  statEmoji: { fontSize: 20 },
  statValue: { fontFamily: "Caveat-Bold", fontSize: 28, color: colors.ink, lineHeight: 32 },
  statLabel: { fontFamily: "PatrickHand", fontSize: 11, color: colors.brown + "B3" },

  favCard: { backgroundColor: "#fff", borderRadius: 24, overflow: "hidden", ...(shadows.card as object) },
  favRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  favDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  favIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  favEmoji: { fontSize: 20 },
  favText: { flex: 1 },
  favTitle: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.ink },
  favSub: { fontFamily: "PatrickHand", fontSize: 12, color: colors.brown + "99", marginTop: 1 },

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

  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 20, maxHeight: "90%",
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  sheetTitle: { fontFamily: "PatrickHand", fontSize: 18, fontWeight: "600", color: colors.ink },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  fieldLabel: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.brown, marginBottom: 8 },
  fieldInput: {
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: "PatrickHand", fontSize: 15, color: colors.ink,
  },
  saveBtn: {
    marginTop: 24, backgroundColor: colors.coral, borderRadius: 32,
    paddingVertical: 14, alignItems: "center",
    shadowColor: colors.coral, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 14,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: "#fff" },
});
