import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, ActivityIndicator, Image, Alert, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Send, Trash2, Pencil,
} from "lucide-react-native";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import { colors } from "@/theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = SCREEN_WIDTH - 40;

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[m - 1]} ${d}, ${y}`;
}
function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const memoryId = id as Id<"memories">;

  const memory = useQuery(api.memories.get, { id: memoryId });
  const reactionData = useQuery(api.reactions.countsForMemory, { memoryId });
  const comments = useQuery(api.comments.listForMemory, { memoryId });
  const currentUser = useQuery(api.users.getCurrentUser);

  const toggleHeart = useMutation(api.reactions.toggle);
  const addComment = useMutation(api.comments.add);
  const removeComment = useMutation(api.comments.remove);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);


  const liked = reactionData?.liked ?? false;
  const likeCount = reactionData?.count ?? 0;
  const commentCount = comments?.length ?? 0;

  // ── Comment ───────────────────────────────────────────────────────────────

  async function submitComment() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await addComment({ memoryId, body: draft.trim() });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (memory === undefined) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock width="40%" height={14} style={{ marginBottom: 24 }} />
          <SkeletonBlock width="100%" height={260} style={{ borderRadius: 20, marginBottom: 24 }} />
          <SkeletonBlock width="75%" height={22} style={{ marginBottom: 12 }} />
          <SkeletonBlock width="100%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="100%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="60%" height={14} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (memory === null) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>not found 🔍</Text>
          <Text style={styles.notFoundBody}>This memory doesn't exist or you don't have access.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const photos = memory.photos ?? [];

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push(`/memory/${id}/edit`)}>
          <Pencil size={20} color={colors.ink} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date row */}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{formatDate(memory.date)}</Text>
          <Text style={styles.weekday}>{memory.weekday} ☀️</Text>
        </View>

        {/* Photo section */}
        {photos.length > 0 ? (
          <View style={styles.photoSection}>
            <FlatList
              data={photos}
              keyExtractor={(item) => item.storageId}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={PHOTO_SIZE + 12}
              decelerationRate="fast"
              contentContainerStyle={{ gap: 12 }}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (PHOTO_SIZE + 12));
                setCurrentPhotoIndex(idx);
              }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.95}
                  onPress={() => setLightboxIndex(index)}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={[styles.photoImg, { width: PHOTO_SIZE }]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
            {photos.length > 1 && (
              <View style={styles.dotRow}>
                {photos.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === currentPhotoIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderEmoji}>📷</Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.title}>{memory.title} 🌿</Text>

        {/* Body */}
        {!!memory.body && (
          <Text style={styles.body}>{memory.body}</Text>
        )}

        {/* Location */}
        {!!memory.location && (
          <Text style={styles.location}>📍 {memory.location}</Text>
        )}

        {/* Reaction row */}
        <View style={styles.reactionRow}>
          <View style={styles.reactionLeft}>
            <TouchableOpacity
              style={styles.reactionBtn}
              onPress={() => toggleHeart({ memoryId })}
              activeOpacity={0.7}
            >
              <Heart
                size={24}
                color={colors.coral}
                fill={liked ? colors.coral : "none"}
                strokeWidth={liked ? 0 : 1.8}
              />
              {likeCount > 0 && <Text style={styles.reactionCount}>{likeCount}</Text>}
            </TouchableOpacity>
            <View style={styles.reactionBtn}>
              <MessageCircle size={22} color={colors.brown + "99"} strokeWidth={1.8} />
              <Text style={styles.reactionCount}>{commentCount}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.iconBtn}>
            <Share2 size={20} color={colors.brown + "80"} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>
            {commentCount === 0 ? "Be the first to comment" : `${commentCount} comment${commentCount === 1 ? "" : "s"}`}
          </Text>

          {comments === undefined ? (
            <>
              <SkeletonBlock width="100%" height={52} style={{ borderRadius: 16, marginBottom: 8 }} />
              <SkeletonBlock width="100%" height={52} style={{ borderRadius: 16 }} />
            </>
          ) : (
            comments.map((c) => (
              <CommentRow
                key={c._id}
                authorName={c.authorName}
                avatarPreset={c.authorAvatarPreset ?? undefined}
                avatarUrl={c.authorAvatarUrl ?? undefined}
                body={c.body}
                createdAt={c.createdAt}
                photoThumbnailUrl={c.photoThumbnailUrl ?? undefined}
                canDelete={c.authorId === currentUser?._id}
                onDelete={() => removeComment({ id: c._id })}
              />
            ))
          )}

          {/* Composer */}
          <View style={styles.composer}>
            {currentUser && (
              <UserAvatar
                name={currentUser.name}
                avatarPreset={currentUser.avatarPreset}
                avatarUrl={currentUser.avatarUrl}
                size={28}
              />
            )}
            <TextInput
              style={styles.composerInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a comment…"
              placeholderTextColor={colors.brown + "80"}
              returnKeyType="send"
              onSubmitEditing={submitComment}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
              onPress={submitComment}
              disabled={sending || !draft.trim()}
            >
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Send size={16} color="#fff" strokeWidth={2} />
              }
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Photo lightbox */}
      <PhotoLightbox
        visible={lightboxIndex !== null}
        photos={photos}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
        favorited={liked}
        onFavorite={() => toggleHeart({ memoryId })}
        onSendComment={async (text, photoStorageId) => {
          await addComment({ memoryId, body: text, ...(photoStorageId ? { photoStorageId: photoStorageId as Id<"_storage"> } : {}) });
        }}
        memoryTitle={memory?.title}
      />

    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CommentRow({
  authorName, avatarPreset, avatarUrl, body, createdAt, photoThumbnailUrl, canDelete, onDelete,
}: {
  authorName: string;
  avatarPreset?: string;
  avatarUrl?: string;
  body: string;
  createdAt: number;
  photoThumbnailUrl?: string;
  canDelete: boolean;
  onDelete: () => void;
}) {
  return (
    <View style={commentStyles.row}>
      <UserAvatar name={authorName} avatarPreset={avatarPreset} avatarUrl={avatarUrl} size={32} />
      <View style={commentStyles.bubble}>
        {photoThumbnailUrl && (
          <Image
            source={{ uri: photoThumbnailUrl }}
            style={commentStyles.photoThumb}
            resizeMode="cover"
          />
        )}
        <View style={commentStyles.bubbleHeader}>
          <Text style={commentStyles.author}>{authorName}</Text>
          <Text style={commentStyles.time}>{relativeTime(createdAt)}</Text>
        </View>
        <Text style={commentStyles.body}>{body}</Text>
      </View>
      {canDelete && (
        <TouchableOpacity onPress={onDelete} style={commentStyles.deleteBtn}>
          <Trash2 size={14} color={colors.brown + "66"} strokeWidth={1.8} />
        </TouchableOpacity>
      )}
    </View>
  );
}


function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: object }) {
  return <View style={[{ width: width as any, height, backgroundColor: colors.border, borderRadius: 8 }, style]} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border + "60",
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  // Date
  dateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  dateText: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.ink },
  weekday: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown },

  // Photos
  photoSection: { marginBottom: 24 },
  photoImg: { height: PHOTO_SIZE, borderRadius: 20 },
  dotRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brown + "40" },
  dotActive: { width: 18, backgroundColor: colors.coral },
  // Placeholder
  photoPlaceholder: {
    height: 200, borderRadius: 20, backgroundColor: colors.paper,
    alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 24,
  },
  photoPlaceholderEmoji: { fontSize: 48 },

  // Text
  title: { fontFamily: "PatrickHand", fontSize: 22, fontWeight: "600", color: colors.ink, lineHeight: 28, marginBottom: 10 },
  body: { fontFamily: "PatrickHand", fontSize: 16, color: colors.ink + "E6", lineHeight: 24, marginBottom: 10 },
  location: { fontFamily: "PatrickHand", fontSize: 13, color: colors.brown + "B3", marginBottom: 12 },


  // Reactions
  reactionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14, marginTop: 16, marginBottom: 16,
  },
  reactionLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
  reactionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  reactionCount: { fontFamily: "PatrickHand", fontSize: 14, fontWeight: "600", color: colors.ink },

  // Comments
  commentsSection: { gap: 10 },
  commentsHeader: { fontFamily: "PatrickHand", fontSize: 15, fontWeight: "600", color: colors.brown + "CC", marginBottom: 4 },
  composer: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 20, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4,
  },
  composerInput: { flex: 1, fontFamily: "PatrickHand", fontSize: 14, color: colors.ink },
  sendBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.pink,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },

  // Not found
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 32 },
  notFoundTitle: { fontFamily: "Caveat-Bold", fontSize: 28, color: colors.coral },
  notFoundBody: { fontFamily: "PatrickHand", fontSize: 14, color: colors.brown + "99", textAlign: "center" },
});

const commentStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  bubble: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  photoThumb: {
    width: "100%", height: 140,
    marginBottom: 0,
  },
  bubbleHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 2, paddingHorizontal: 12, paddingTop: 8,
  },
  author: { fontFamily: "PatrickHand", fontSize: 12, fontWeight: "600", color: colors.brown },
  time: { fontFamily: "PatrickHand", fontSize: 11, color: colors.brown + "80" },
  body: { fontFamily: "PatrickHand", fontSize: 14, color: colors.ink, lineHeight: 18, paddingHorizontal: 12, paddingBottom: 8 },
  deleteBtn: { marginTop: 8 },
});

