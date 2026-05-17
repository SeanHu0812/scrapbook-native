import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { View } from "react-native";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "PatrickHand": require("../assets/fonts/PatrickHand-Regular.ttf"),
    "Caveat-Regular": require("../assets/fonts/Caveat-Regular.ttf"),
    "Caveat-SemiBold": require("../assets/fonts/Caveat-SemiBold.ttf"),
    "Caveat-Bold": require("../assets/fonts/Caveat-Bold.ttf"),
    "Gaegu": require("../assets/fonts/Gaegu-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ConvexClientProvider>
      <View style={{ flex: 1, backgroundColor: "#FFF9EF" }}>
        <Slot />
      </View>
    </ConvexClientProvider>
  );
}
