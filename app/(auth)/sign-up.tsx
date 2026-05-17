import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useAuth } from "@/lib/convex";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";

export default function SignUpScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  }

  async function handleSignUp() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setLoading(true);
    try {
      const result = await signIn("password", { email, password, flow: "signUp" });
      if (!result.signingIn) {
        setError("Account created but sign-in failed — please sign in manually.");
        return;
      }
      router.replace("/onboarding/profile");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't create account. Try a different email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>scrapbook</Text>
          <Text style={styles.heart}>♡</Text>
          <Text style={styles.tagline}>collect little moments, together</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Create your space 🌸</Text>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.brown + "66"}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="8+ characters"
              placeholderTextColor={colors.brown + "66"}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.disabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.primaryBtnText}>Create account</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OAuth */}
          <OAuthButton label="Continue with Apple" icon={<Text style={styles.oauthIcon}></Text>} />
          <OAuthButton label="Continue with Google" icon={<Text style={styles.oauthIcon}>G</Text>} />
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Already have an account?{" "}
          <Link href="/(auth)/sign-in" style={styles.footerLink}>Sign in</Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function OAuthButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <TouchableOpacity style={styles.oauthBtn} activeOpacity={0.8}>
      {icon}
      <Text style={styles.oauthBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    fontFamily: "Caveat-Bold",
    fontSize: 36,
    color: colors.coral,
    lineHeight: 40,
  },
  heart: {
    fontSize: 16,
    color: colors.pink,
    marginTop: 2,
  },
  tagline: {
    fontFamily: "PatrickHand",
    fontSize: 13,
    color: colors.brown + "B3",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    ...(shadows.card as object),
  },
  title: {
    fontFamily: "PatrickHand",
    fontSize: 20,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontFamily: "PatrickHand",
    fontSize: 13,
    color: colors.brown + "CC",
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "PatrickHand",
    color: colors.ink,
  },
  error: {
    fontFamily: "PatrickHand",
    fontSize: 13,
    color: colors.coral,
    marginBottom: 8,
  },
  primaryBtn: {
    backgroundColor: colors.coral,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: "PatrickHand",
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: "PatrickHand",
    fontSize: 13,
    color: colors.brown + "99",
  },
  oauthBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  oauthIcon: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
  },
  oauthBtnText: {
    fontFamily: "PatrickHand",
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: "PatrickHand",
    fontSize: 14,
    color: colors.brown + "CC",
  },
  footerLink: {
    color: colors.coral,
    fontWeight: "600",
  },
});
