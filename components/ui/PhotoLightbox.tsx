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

const THUMB_SIZE = 52;
const THUMB_GAP = 3;
const THUMB_STRIDE = THUMB_SIZE + THUMB_GAP;
const FILMSTRIP_H = THUMB_SIZE + 14; // 7px top/bottom padding
const TOOLBAR_INNER = 42;            // icon row height, before safe area

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
  const listRef    = useRef<FlatList>(null);
  const filmRef    = useRef<FlatList>(null);
  const commentRef = useRef<TextInput>(null);

  const [currentIndex, setCurrentIndex]   = useState(initialIndex);
  const [downloading, setDownloading]     = useState(false);
  const [commentOpen, setCommentOpen]     = useState(false);
  const [commentText, setCommentText]     = useState("");
  const [sending, setSending]             = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Total chrome height sitting at the bottom (filmstrip + toolbar + safe area)
  const chromeHeight = FILMSTRIP_H + TOOLBAR_INNER + insets.bottom;

  // Comment bar sits just above the chrome when keyboard hidden,
  // or just above the keyboard when it's visible.
  const commentBarBottom = keyboardHeight > 0 ? keyboardHeight : chromeHeight;

  // ── Keyboard tracking ─────────────────────────────────────────────────────

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Reset on close ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) {
      setCommentOpen(false);
      setCommentText("");
      setKeyboardHeight(0);
    }
  }, [visible]);

  // ── Sync scroll when lightbox opens ──────────────────────────────────────

  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(initialIndex);
    const t = setTimeout(() => {
      if (initialIndex > 0) {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }
      filmRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [visible, initialIndex]);

  // ── Scroll filmstrip when current index changes ───────────────────────────

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    if (photos.length < 2) return;
    filmRef.current?.scrollToIndex({
      index: currentIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, [currentIndex, photos.length]);

  // ── FlatList helpers ──────────────────────────────────────────────────────

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    []
  );

  const getMainLayout = useCallback(
    (_: unknown, index: number) => ({ length: SCREEN_W, offset: SCREEN_W * index, index }),
    []
  );

  const getFilmLayout = useCallback(
    (_: unknown, index: number) => ({ length: THUMB_STRIDE, offset: THUMB_STRIDE * index, index }),
    []
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  function jumpToPhoto(index: number) {
    setCurrentIndex(index);
    listRef.current?.scrollToIndex({ index, animated: false });
  }

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

  // ── Render ────────────────────────────────────────────────────────────────

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

        {/* ── Main photo pager ────────────────────────────────────────── */}
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={getMainLayout}
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
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12} activeOpacity={0.75}>
            <X size={18} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>

          {photos.length > 1 && (
            <Text style={styles.counter}>{currentIndex + 1} / {photos.length}</Text>
          )}

          <View style={{ width: 38 }} />
        </SafeAreaView>

        {/* ── Filmstrip ───────────────────────────────────────────────── */}
        {photos.length > 1 && (
          <View style={[styles.filmstrip, { bottom: TOOLBAR_INNER + insets.bottom }]}>
            <FlatList
              ref={filmRef}
              data={photos}
              keyExtractor={(_, i) => `f${i}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              getItemLayout={getFilmLayout}
              contentContainerStyle={styles.filmContent}
              renderItem={({ item, index }) => {
                const active = index === currentIndex;
                return (
                  <TouchableOpacity
                    onPress={() => jumpToPhoto(index)}
                    activeOpacity={0.8}
                    style={[styles.thumb, active && styles.thumbActive]}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={styles.thumbImg}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* ── Inline comment composer ──────────────────────────────────── */}
        {commentOpen && (
          <View style={[styles.commentBar, { bottom: commentBarBottom }]}>
            <TouchableOpacity style={styles.commentDismiss} onPress={closeComment} hitSlop={8}>
              <X size={15} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
            </TouchableOpacity>

            <TextInput
              ref={commentRef}
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              autoCorrect
              multiline={false}
              selectionColor="rgba(255,255,255,0.6)"
            />

            <TouchableOpacity
              style={[styles.sendBtn, (!commentText.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!commentText.trim() || sending}
              activeOpacity={0.75}
            >
              {sending
                ? <ActivityIndicator color="rgba(255,255,255,0.8)" size="small" />
                : <Send size={15} color="rgba(255,255,255,0.9)" strokeWidth={2.2} />
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <View
          style={[
            styles.toolbar,
            { paddingBottom: insets.bottom, height: TOOLBAR_INNER + insets.bottom },
            commentOpen && styles.toolbarDimmed,
          ]}
        >
          <ToolBtn
            icon={<Share2 size={22} color="#fff" strokeWidth={1.8} />}
            onPress={handleShare}
          />
          <ToolBtn
            icon={
              <Heart
                size={22}
                color={favorited ? colors.coral : "#fff"}
                fill={favorited ? colors.coral : "none"}
                strokeWidth={favorited ? 0 : 1.8}
              />
            }
            onPress={onFavorite}
          />
          <ToolBtn
            icon={
              <MessageCircle
                size={22}
                color={commentOpen ? colors.coral : "#fff"}
                strokeWidth={1.8}
              />
            }
            onPress={onSendComment ? openComment : undefined}
          />
          <ToolBtn
            icon={
              downloading
                ? <ActivityIndicator color="#fff" size="small" style={{ width: 22, height: 22 }} />
                : <Download size={22} color="#fff" strokeWidth={1.8} />
            }
            onPress={handleDownload}
          />
        </View>

      </View>
    </Modal>
  );
}

// ── ToolBtn ───────────────────────────────────────────────────────────────────

function ToolBtn({ icon, onPress }: { icon: React.ReactNode; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={toolStyles.btn}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
      disabled={!onPress}
    >
      {icon}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  // Main photo
  page: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: SCREEN_W, height: SCREEN_H },

  // Top bar
  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 4,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  closeBtn: {
    width: 38, height: 38,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 19,
  },
  counter: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "PatrickHand",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Filmstrip
  filmstrip: {
    position: "absolute",
    left: 0, right: 0,
    height: FILMSTRIP_H,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  filmContent: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: THUMB_GAP,
    alignItems: "center",
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 4,
    overflow: "hidden",
    opacity: 0.55,
  },
  thumbActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 4,
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },

  // Inline comment bar
  commentBar: {
    position: "absolute",
    left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  commentDismiss: {
    width: 28, height: 28,
    alignItems: "center", justifyContent: "center",
  },
  commentInput: {
    flex: 1,
    fontFamily: "PatrickHand",
    fontSize: 15,
    color: "#fff",
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
  },
  sendBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.35 },

  // Toolbar
  toolbar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.82)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  toolbarDimmed: { opacity: 0.3 },
});

const toolStyles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: TOOLBAR_INNER,
  },
});
