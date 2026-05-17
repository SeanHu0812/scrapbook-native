import { ConvexReactClient, useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

export const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  return { isLoading, isAuthenticated, signIn, signOut };
}
