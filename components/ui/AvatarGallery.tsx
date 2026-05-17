import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from "react-native";
import { SvgXml } from "react-native-svg";
import { Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AVATAR_SVGS, AVATAR_PRESETS } from "@/constants/avatars";
import { colors } from "@/theme/colors";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

type Props = {
  selectedPreset: string | null;
  onSelectPreset: (id: string) => void;
  onUpload: (storageId: string, previewUrl: string) => void;
  uploadPreviewUrl?: string | null;
};

export function AvatarGallery({ selectedPreset, onSelectPreset, onUpload, uploadPreviewUrl }: Props) {
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const isUploadSelected = !selectedPreset && !!uploadPreviewUrl;

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": "image/jpeg" },
        mimeType: "image/jpeg",
      });
      const { storageId } = JSON.parse(uploadResult.body) as { storageId: Id<"_storage"> };
      onUpload(storageId as string, uri);
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.grid}>
      {AVATAR_PRESETS.map((id) => {
        const isSelected = selectedPreset === id;
        return (
          <TouchableOpacity
            key={id}
            style={[styles.tile, isSelected && styles.tileSelected]}
            onPress={() => onSelectPreset(id)}
            activeOpacity={0.8}
          >
            <SvgXml xml={AVATAR_SVGS[id]} width="100%" height="100%" />
          </TouchableOpacity>
        );
      })}

      {/* Upload tile */}
      <TouchableOpacity
        style={[styles.tile, styles.uploadTile, isUploadSelected && styles.tileSelected]}
        onPress={handlePickImage}
        activeOpacity={0.8}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={colors.coral} size="small" />
        ) : uploadPreviewUrl ? (
          <Image source={{ uri: uploadPreviewUrl }} style={styles.uploadPreview} />
        ) : (
          <Camera size={20} color={colors.brown + "80"} strokeWidth={1.8} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tile: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.border,
  },
  tileSelected: {
    borderColor: colors.coral,
    shadowColor: colors.coral,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  uploadTile: {
    borderStyle: "dashed",
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadPreview: {
    width: "100%",
    height: "100%",
  },
});
