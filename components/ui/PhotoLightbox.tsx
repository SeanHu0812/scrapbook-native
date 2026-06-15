import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  Modal, View, Image, Animated, FlatList, ScrollView, TextInput, TouchableOpacity,
  Text, StyleSheet, Dimensions, StatusBar, Share, Alert,
  ActivityIndicator, Platform, Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Heart, MessageCircle, Share2, Download, Send } from "lucide-react-native";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { colors } from "@/theme/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const THUMB_SIZE    = 26;
const THUMB_GAP     = 5;          // uniform gap between every thumbnail
const ITEM_W        = THUMB_SIZE + THUMB_GAP; // 31px — constant stride
const FILM_EDGE_PAD = (SCREEN_W - THUMB_SIZE) / 2; // centers item 0; scroll x=i*ITEM_W centers item i
const FILMSTRIP_H   = THUMB_SIZE + 8;
const TOOLBAR_INNER = 42;

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
  onSendComment?: (text: string, photoStorageId?: string) => Promise<void>;
  memoryTitle?: string;
}

export function PhotoLightbox({
  visible, photos, initialIndex = 0, onClose,
  favorited, onFavorite, onSendComment, memoryTitle,
}: PhotoLightboxProps) {
  const insets = useSafeAreaInsets();
  const listRef     = useRef<FlatList>(null);
  const filmRef     = useRef<ScrollView>(null);
  const commentRef  = useRef<TextInput>(null);

  const [currentIndex, setCurrentIndex]     = useState(initialIndex);
  const [downloading, setDownloading]       = useState(false);
  const [commentOpen, setCommentOpen]       = useState(false);
  const [commentText, setCommentText]       = useState("");
  const [sending, setSending]               = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const thumbScalesRef = useRef<Animated.Value[]>([]);
  if (thumbScalesRef.current.length !== photos.length) {
    thumbScalesRef.current = photos.map(() => new Animated.Value(1));
  }
  const thumbScales = thumbScalesRef.current;

  const hasFilmstrip  = photos.length > 1;
  const toolbarHeight = TOOLBAR_INNER + insets.bottom;
  const chromeHeight  = (hasFilmstrip ? FILMSTRIP_H : 0) + toolbarHeight;

  // ── Keyboard tracking ──────────────────────────────────────────────────────

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Reset on close ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) {
      setCommentOpen(false);
      setCommentText("");
      setKeyboardHeight(0);
    }
  }, [visible]);

  // ── Sync scroll when lightbox opens ───────────────────────────────────────

  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(initialIndex);
    const t = setTimeout(() => {
      if (initialIndex > 0) {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }
      if (hasFilmstrip) {
        filmRef.current?.scrollTo({ x: initialIndex * ITEM_W, animated: false });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [visible, initialIndex, hasFilmstrip]);

  // ── Thumbnail pulse + filmstrip centering ──────────────────────────────────

  useEffect(() => {
    thumbScales.forEach((s, i) => {
      if (i !== currentIndex) { s.stopAnimation(); s.setValue(1); }
    });

    const active = thumbScales[currentIndex];
    if (active) {
      active.setValue(1.135);
      Animated.spring(active, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 5,
      }).start();
    }

    if (hasFilmstrip && photos.length > 1) {
      // x = i * ITEM_W exactly centers item i when paddingHorizontal = FILM_EDGE_PAD
      filmRef.current?.scrollTo({ x: currentIndex * ITEM_W, animated: true });
    }
  }, [currentIndex, hasFilmstrip]);

  // ── FlatList helpers ───────────────────────────────────────────────────────

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

  // ── Actions ────────────────────────────────────────────────────────────────

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
      await onSendComment(commentText.trim(), photos[currentIndex]?.storageId);
      setCommentText("");
      closeComment();
    } catch {
      Alert.alert("Error", "Could not send comment.");
    } finally {
      setSending(false);
    }
  }

  const handleShare = useCallback(async () => {
    const url = photos[currentIndex]?.url;
    if (!url) return;
    try {
      await Share.share(
        Platform.OS === "ios"
          ? { url, message: memoryTitle ? `${memoryTitle} 💕` : "Check out this memory 💕" }
          : { message: url }
      );
    } catch {}
  }, [photos, currentIndex, memoryTitle]);

  const handleDownload = useCallback(async () => {
    const url = photos[currentIndex]?.url;
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
  }, [photos, currentIndex, downloading]);

  // ── Render ─────────────────────────────────────────────────────────────────

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

        {/* ── Main photo pager ──────────────────────────────────────────── */}
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

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <SafeAreaView style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12} activeOpacity={0.75}>
            <X size={18} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>

          {photos.length > 1 && (
            <Text style={styles.counter}>{currentIndex + 1} / {photos.length}</Text>
          )}

          <View style={{ width: 38 }} />
        </SafeAreaView>

        {/* ── Filmstrip — sits above toolbar, transparent bg ────────────── */}
        {hasFilmstrip && !commentOpen && (
          <View style={[styles.filmstrip, { bottom: toolbarHeight }]}>
            <ScrollView
              ref={filmRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              contentContainerStyle={{
                paddingHorizontal: FILM_EDGE_PAD,
                paddingVertical: 4,
              }}
            >
              {photos.map((item, index) => {
                const selected = index === currentIndex;
                const scale = thumbScales[index] ?? new Animated.Value(1);
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => jumpToPhoto(index)}
                    activeOpacity={0.75}
                    style={styles.thumbWrap}
                  >
                    <Animated.Image
                      source={{ uri: item.url }}
                      style={[
                        styles.thumbImg,
                        { opacity: selected ? 1 : 0.5, transform: [{ scale }] },
                      ]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Toolbar ───────────────────────────────────────────────────── */}
        <View style={[styles.toolbar, { paddingBottom: insets.bottom, height: toolbarHeight }]}>
          <ToolBtn icon={<Share2 size={22} color="#fff" strokeWidth={1.8} />} onPress={handleShare} />
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

        {/* ── Comment bar — overlays the toolbar, never covers the photo ── */}
        {commentOpen && (
          <View
            style={[
              styles.commentBar,
              {
                bottom: keyboardHeight,
                paddingBottom: keyboardHeight > 0 ? 8 : insets.bottom,
                minHeight: toolbarHeight,
              },
            ]}
          >
            <TouchableOpacity style={styles.commentDismiss} onPress={closeComment} hitSlop={8}>
              <X size={15} color="rgba(255,255,255,0.55)" strokeWidth={2.5} />
            </TouchableOpacity>

            <TextInput
              ref={commentRef}
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment…"
              placeholderTextColor="rgba(255,255,255,0.3)"
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

  page: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: SCREEN_W, height: SCREEN_H },

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

  filmstrip: {
    position: "absolute",
    left: 0, right: 0,
    height: FILMSTRIP_H,
  },

  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginRight: THUMB_GAP,
    overflow: "visible",
  },
  thumbImg: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 3,
  },

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

  commentBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.92)",
    paddingHorizontal: 12,
    paddingTop: 8,
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
    borderColor: "rgba(255,255,255,0.18)",
  },
  sendBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.3 },
});

const toolStyles = StyleSheet.create({
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: TOOLBAR_INNER,
  },
});
