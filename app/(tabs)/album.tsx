import { useState, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  Image, StyleSheet, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PhotoLightbox, type LightboxPhoto } from "@/components/ui/PhotoLightbox";
import { colors } from "@/theme/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const CELL = Math.floor(SCREEN_W / 3);
const GAP = 1;

type AlbumPhoto = {
  url: string;
  storageId: Id<"_storage">;
  memoryId: Id<"memories"> | null;
  memoryTitle: string;
  date: string;
};

export default function AlbumScreen() {
  const photos = useQuery(api.memories.listAllPhotos) as AlbumPhoto[] | undefined;

  const [lightbox, setLightbox] = useState<{
    photos: LightboxPhoto[];
    initialIndex: number;
    memoryTitle: string;
  } | null>(null);

  // Group memory-attached photos by memoryId for lightbox; standalone photos open alone
  const byMemory = useMemo(() => {
    const map = new Map<string, LightboxPhoto[]>();
    for (const p of photos ?? []) {
      if (!p.memoryId) continue;
      const key = p.memoryId as string;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ url: p.url, storageId: p.storageId as string });
    }
    return map;
  }, [photos]);

  function openPhoto(photo: AlbumPhoto) {
    const group = photo.memoryId
      ? (byMemory.get(photo.memoryId as string) ?? [{ url: photo.url }])
      : [{ url: photo.url, storageId: photo.storageId as string }];
    const initialIndex = group.findIndex((p) => p.url === photo.url);
    setLightbox({
      photos: group,
      initialIndex: Math.max(0, initialIndex),
      memoryTitle: photo.memoryTitle,
    });
  }

  const isLoading = photos === undefined;
  const isEmpty = !isLoading && photos.length === 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Our Album</Text>
        {!isLoading && photos.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{photos.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        // Skeleton grid
        <FlatList
          data={Array.from({ length: 12 })}
          keyExtractor={(_, i) => String(i)}
          numColumns={3}
          scrollEnabled={false}
          renderItem={() => <View style={styles.skeletonCell} />}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        />
      ) : isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌸</Text>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtitle}>Add photos to a memory and they'll show up here</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.storageId as string}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cell}
              onPress={() => openPhoto(item)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.url }} style={styles.cellImage} resizeMode="cover" />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        />
      )}

      <PhotoLightbox
        visible={!!lightbox}
        photos={lightbox?.photos ?? []}
        initialIndex={lightbox?.initialIndex ?? 0}
        memoryTitle={lightbox?.memoryTitle}
        onClose={() => setLightbox(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#000",
  },
  title: { fontFamily: "Caveat-Bold", fontSize: 26, color: "#fff" },
  countBadge: {
    backgroundColor: colors.coral, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countText: { fontFamily: "PatrickHand", fontSize: 13, color: "#fff", fontWeight: "600" },

  grid: { gap: GAP },
  cell: { width: CELL, height: CELL, marginRight: GAP },
  cellImage: { width: CELL, height: CELL },

  skeletonCell: {
    width: CELL, height: CELL,
    marginRight: GAP,
    backgroundColor: "#222",
  },

  empty: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 10,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: "Caveat-Bold", fontSize: 26, color: "#fff" },
  emptySubtitle: { fontFamily: "PatrickHand", fontSize: 15, color: "rgba(255,255,255,0.5)", textAlign: "center", lineHeight: 22 },
});
