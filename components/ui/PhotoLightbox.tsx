import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  Modal, View, Image, FlatList, TextInput, TouchableOpacity, Text, StyleSheet,
  Dimensions, StatusBar, Share, Alert, ActivityIndicator, Platform, Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Heart, MessageCircle, Share2, Download, Send } from "lucide-react-native";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { colors } from "@/theme/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export interface LightboxPhoto {
  url: string;
  storageId?: string;
}

interface PhotoLightboxProps {
  visible: boolean;
  photos: LightboxPhoto[];
  initialIndex?: number;
  onClose: () => void;
  favorited?: boolean;
  onFavorite?: () => void;
  onSendComment?: (text: string) => Promise<void>;
  memoryTitle?: string;
}

export function PhotoLightbox({
  visible, photos, initialIndex = 0, onClose,
  favorited, onFavorite, onSendComment, memoryTitle,
}: PhotoLightboxProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const commentRef = useRef<TextInput>(null);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [downloading, setDownloading] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keyboard height tracking — drives comment bar position
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Reset comment state when lightbox closes
  useEffect(() => {
    if (!visible) {
      setCommentOpen(false);
      setCommentText("");
      setKeyboardHeight(0);
    }
  }, [visible]);

  // Sync scroll position when lightbox opens at a specific index
  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(initialIndex);
    if (initialIndex > 0) {
      const t = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [visible, initialIndex]);

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: SCREEN_W, offset: SCREEN_W * index, index }),
    []
  );

  // ── Actions ─────────────────────────────────────────────────────────────────

  function openComment() {
    setCommentOpen(true);
    setTimeout(() => commentRef.current?.focus(), 80);
  }

  function closeComment() {
    Keyboard.dismiss();
    setCommentOpen(false);
    setCommentText("");
  }

  async function handleSend() {
    if (!commentText.trim() || !onSendComment || sending) return;
    setSending(true);
    try {
      await onSendComment(commentText.trim());
      setCommentText("");
      closeComment();
    } catch {
      Alert.alert("Error", "Could not send comment.");
    } finally {
      setSending(false);
    }
  }

  const handleShare = useCallback(async () => {
    const url = photos[currentIndexRef.current]?.url;
    if (!url) return;
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { url, message: memoryTitle ? `${memoryTitle} 💕` : "Check out this memory 💕" }
          : { message: url }
      );
    } catch {}
  }, [photos, memoryTitle]);

  const handleDownload = useCallback(async () => {
    const url = photos[currentIndexRef.current]?.url;
    if (!url || downloading) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to save photos.");
      return;
    }
    setDownloading(true);
    try {
      const fileUri = `${FileSystem.documentDirectory}scrapbook_${Date.now()}.jpg`;
      await FileSystem.downloadAsync(url, fileUri);
      await MediaLibrary.saveToLibraryAsync(fileUri);
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      Alert.alert("Saved! 🌸", "Photo saved to your camera roll.");
    } catch {
      Alert.alert("Error", "Could not save photo.");
    } finally {
      setDownloading(false);
    }
  }, [photos, downloading]);

  // The comment bar floats just above the keyboard.
  // When keyboard is hidden it sits above the toolbar (toolbar ≈ 56px + bottom inset).
  const toolbarHeight = 56 + insets.bottom;
  const commentBarBottom = keyboardHeight > 0 ? keyboardHeight : toolbarHeight;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={commentOpen ? closeComment : onClose}
      hardwareAccelerated
    >
      <StatusBar hidden />
      <View style={styles.root}>

        {/* ── Photo pager ─────────────────────────────────────────────── */}
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          decelerationRate="fast"
          bounces={photos.length > 1}
          scrollEnabled={!commentOpen}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={1}
              style={styles.page}
              onPress={commentOpen ? closeComment : undefined}
            >
              <Image source={{ uri: item.url }} style={styles.image} resizeMode="contain" />
            </TouchableOpacity>
          )}
        />

        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <SafeAreaView style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={16} activeOpacity={0.8}>
            <X size={20} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>

          {photos.length > 1 ? (
            <Text style={styles.counter}>{currentIndex + 1} / {photos.length}</Text>
          ) : (
            <View />
          )}

          <View style={{ width: 44 }} />
        </SafeAreaView>

        {/* ── Dot indicators ──────────────────────────────────────────── */}
        {photos.length > 1 && !commentOpen && (
          <View style={styles.dotRow} pointerEvents="none">
            {photos.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
            ))}
          </View>
        )}

        {/* ── Inline comment composer ──────────────────────────────────── */}
        {commentOpen && (
          <View style={[styles.commentBar, { bottom: commentBarBottom }]}>
            {/* Dismiss handle */}
            <TouchableOpacity style={styles.commentClose} onPress={closeComment} hitSlop={8}>
              <X size={16} color={colors.brown} strokeWidth={2.5} />
            </TouchableOpacity>

            <TextInput
              ref={commentRef}
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment…"
              placeholderTextColor={colors.brown + "80"}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              autoCorrect
              multiline={false}
            />

            <TouchableOpacity
              style={[styles.sendBtn, (!commentText.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!commentText.trim() || sending}
              activeOpacity={0.8}
            >
              {sending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Send size={15} color="#fff" strokeWidth={2.2} />
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Bottom toolbar ──────────────────────────────────────────── */}
        <SafeAreaView edges={["bottom"]} style={[styles.toolbar, commentOpen && styles.toolbarDimmed]}>
          <ToolbarBtn
            icon={
              <Heart
                size={26}
                color={favorited ? colors.coral : "#fff"}
                fill={favorited ? colors.coral : "none"}
                strokeWidth={favorited ? 0 : 1.8}
              />
            }
            label="Favorite"
            onPress={onFavorite}
            active={favorited}
          />
          <ToolbarBtn
            icon={
              <MessageCircle
                size={26}
                color={commentOpen ? colors.coral : "#fff"}
                strokeWidth={1.8}
              />
            }
            label="Comment"
            onPress={onSendComment ? openComment : undefined}
            active={commentOpen}
          />
          <ToolbarBtn
            icon={<Share2 size={26} color="#fff" strokeWidth={1.8} />}
            label="Share"
            onPress={handleShare}
          />
          <ToolbarBtn
            icon={
              downloading
                ? <ActivityIndicator color="#fff" size="small" style={{ width: 26, height: 26 }} />
                : <Download size={26} color="#fff" strokeWidth={1.8} />
            }
            label="Save"
            onPress={handleDownload}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ── ToolbarBtn ────────────────────────────────────────────────────────────────

function ToolbarBtn({
  icon, label, onPress, active,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <TouchableOpacity
      style={toolbarStyles.btn}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {icon}
      <Text style={[toolbarStyles.label, active && toolbarStyles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  page: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
  },

  // Top bar
  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  closeBtn: {
    width: 44, height: 44,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 22,
  },
  counter: {
    color: "#fff",
    fontFamily: "PatrickHand",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // Dot indicators
  dotRow: {
    position: "absolute",
    bottom: 110,
    left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#fff",
  },

  // Inline comment bar — floats above keyboard / toolbar
  commentBar: {
    position: "absolute",
    left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  commentClose: {
    width: 30, height: 30,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.paper,
    borderRadius: 15,
  },
  commentInput: {
    flex: 1,
    fontFamily: "PatrickHand",
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: colors.coral,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },

  // Bottom toolbar
  toolbar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  toolbarDimmed: {
    opacity: 0.35,
  },
});

const toolbarStyles = StyleSheet.create({
  btn: {
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    minWidth: 64,
  },
  label: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: "PatrickHand",
    fontSize: 12,
  },
  labelActive: {
    color: colors.coral,
  },
});
