import { Stack } from "expo-router";
import { usePreventScreenCapture } from "expo-screen-capture";

export default function RootLayout() {
  usePreventScreenCapture();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="login"
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="course/[id]" />
    </Stack>
  );
}


