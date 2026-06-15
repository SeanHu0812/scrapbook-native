import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  Modal, View, Image, FlatList, TouchableOpacity, Text, StyleSheet,
  Dimensions, StatusBar, Share, Alert, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Heart, MessageCircle, Share2, Download } from "lucide-react-native";
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
  // Toolbar callbacks — all optional so the component works anywhere
  favorited?: boolean;
  onFavorite?: () => void;
  onComment?: () => void;
  memoryTitle?: string;
}

export function PhotoLightbox({
  visible, photos, initialIndex = 0, onClose,
  favorited, onFavorite, onComment, memoryTitle,
}: PhotoLightboxProps) {
  const listRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [downloading, setDownloading] = useState(false);

  // Sync index and scroll position each time the lightbox opens
  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(initialIndex);
    if (initialIndex > 0) {
      // Give the FlatList a tick to mount before scrolling
      const t = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [visible, initialIndex]);

  // Use a ref for the callback so it never stale-closes over currentIndex
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

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

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: SCREEN_W, offset: SCREEN_W * index, index }),
    []
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
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
          renderItem={({ item }) => (
            <View style={styles.page}>
              <Image
                source={{ uri: item.url }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
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

          {/* Right slot placeholder to keep counter centered */}
          <View style={{ width: 44 }} />
        </SafeAreaView>

        {/* ── Dot indicators ──────────────────────────────────────────── */}
        {photos.length > 1 && (
          <View style={styles.dotRow} pointerEvents="none">
            {photos.map((_, i) => (
              <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
            ))}
          </View>
        )}

        {/* ── Bottom toolbar ──────────────────────────────────────────── */}
        <SafeAreaView edges={["bottom"]} style={styles.toolbar}>
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
            icon={<MessageCircle size={26} color="#fff" strokeWidth={1.8} />}
            label="Comment"
            onPress={onComment}
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

  // Top bar — absolute so it floats over the image
  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    // gradient-like fade from black
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
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // Dot indicators sit just above the toolbar
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
