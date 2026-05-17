import { View, Image, Text, StyleSheet } from "react-native";

const TINTS = ["#FCE4E7", "#E5F2FB", "#FFF3D1", "#E2F0DD"];

type Props = {
  name: string;
  avatarPreset?: string | null;
  avatarUrl?: string | null;
  size?: number;
};

export function UserAvatar({ name, avatarPreset, avatarUrl, size = 64 }: Props) {
  const bg = TINTS[(name?.charCodeAt(0) ?? 0) % TINTS.length];
  const src = avatarUrl ?? (avatarPreset ? `/avatars/${avatarPreset}.png` : null);

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>
          {name?.[0]?.toUpperCase() ?? "?"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C5A4E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  initial: {
    fontFamily: "Caveat-Bold",
    color: "#F98592",
  },
});
