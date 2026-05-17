import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ReactNode } from "react";
import { convex } from "@/lib/convex";
import * as SecureStore from "expo-secure-store";

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider
      client={convex}
      storage={secureStorage}
      replaceURL={() => {}}
    >
      {children}
    </ConvexAuthProvider>
  );
}
