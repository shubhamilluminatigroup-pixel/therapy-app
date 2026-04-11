import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useAuthUser } from "../lib/useAuth";

const { width, height } = Dimensions.get("window");

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const translateValue = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();

    Animated.parallel([
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(translateValue, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace("/(tabs)");
    }, 3000);

    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [fadeValue, router, spinValue, translateValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/mrc-logo.png")}
        style={styles.image}
        resizeMode="contain"
      />

      <Animated.View
        style={[
          styles.captionCard,
          {
            opacity: fadeValue,
            transform: [{ translateY: translateValue }],
          },
        ]}
      >
        <Text style={styles.captionText}>
          Where healing begins from within.
        </Text>
      </Animated.View>

      <View style={styles.overlay}>
        <Animated.View style={[styles.loader, { transform: [{ rotate }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  image: {
    width: width * 0.92,
    height: height * 0.42,
  },
  captionCard: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    maxWidth: width * 0.88,
  },
  captionText: {
    fontSize: 20,
    lineHeight: 28,
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  overlay: {
    position: "absolute",
    bottom: 42,
    width: "100%",
    alignItems: "center",
  },
  loader: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 4,
    borderColor: "#cbd5e1",
    borderTopColor: "#2563eb",
  },
});
