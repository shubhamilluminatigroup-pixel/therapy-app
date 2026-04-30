import { useFocusEffect } from "@react-navigation/native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listFeedbackImages,
  listHomeCategories,
  listHomeTopMedia,
} from "../../lib/api";
import { FeedbackImageItem } from "../../types/backend";

// ✅ LOCAL VIDEO (place file in assets/videos/)
const localIntroVideo = require("../../assets/images/intro.mp4");
const whatsappHelpUrl = "https://wa.me/917351154123";
const socialLinks = [
  {
    color: "#1877f2",
    icon: "facebook",
    label: "Facebook",
    url: "https://www.facebook.com/mrc.aarogyam",
  },
  {
    color: "#e4405f",
    icon: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/dr.abhishek__sharma/?igsh=MXNka3N5OXZqOTNnZQ%3D%3D",
  },
  {
    color: "#ff0000",
    icon: "youtube-play",
    label: "YouTube",
    url: "https://www.youtube.com/@mrcayurveda3775",
  },
  {
    color: "#25d366",
    icon: "whatsapp",
    label: "WhatsApp",
    url: whatsappHelpUrl,
  },
] as const;

export default function HomeScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [topMedia, setTopMedia] = useState<any[]>([]);
  const [feedbackImages, setFeedbackImages] = useState<FeedbackImageItem[]>([]);
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState(0);
  const [feedbackWidth, setFeedbackWidth] = useState(0);
  const feedbackScrollRef = useRef<ScrollView | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const loadHomeData = useCallback(async () => {
    try {
      const [categoryRows, topMediaRows, images] = await Promise.all([
        listHomeCategories(),
        listHomeTopMedia().catch((error) => {
          console.log("Load top media error:", error);
          return [];
        }),
        listFeedbackImages().catch((error) => {
          console.log("Load feedback images error:", error);
          return [];
        }),
      ]);

      setCategories(categoryRows);
      setTopMedia(topMediaRows);
      setFeedbackImages(images);
    } catch (error) {
      console.log("Load courses error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHomeData();
    }, [loadHomeData])
  );

  const groupedCategories = useMemo(() => categories, [categories]);

  const normalizeSortOrder = (value: number | string | undefined | null) => {
    if (value === null || value === undefined || value === "") {
      return 999999;
    }
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 999999;
  };

  useEffect(() => {
    if (!feedbackImages.length || !feedbackWidth) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentFeedbackIndex((current) => {
        const nextIndex = (current + 1) % feedbackImages.length;
        feedbackScrollRef.current?.scrollTo({
          x: nextIndex * feedbackWidth,
          y: 0,
          animated: true,
        });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [feedbackImages, feedbackWidth]);

  const currentFeedback = feedbackImages[currentFeedbackIndex];

  // ✅ VIDEO PLAYER USING LOCAL FILE
  const [isFinished, setIsFinished] = useState(false);

  const featuredVideoPlayer = useVideoPlayer(localIntroVideo, (player) => {
    player.loop = true;        // ❌ no loop
    player.muted = false;       // 🔊 sound ON
    player.play();              // ▶️ autoplay

    player.addListener("playToEnd", () => {
      setIsFinished(true);      // ✅ show replay button
    });
  });

  const openCourse = (courseId: string) => {
    router.push(`/course/${courseId}`);
  };

  const openWhatsappHelp = () => {
    void Linking.openURL(whatsappHelpUrl);
  };

  const openExternalUrl = (url: string) => {
    void Linking.openURL(url);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={groupedCategories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        initialNumToRender={3}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.heading}>Explore Courses</Text>
                <Text style={styles.subheading}>
                  Find the right therapy for your journey
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Open WhatsApp help chat"
                accessibilityRole="button"
                hitSlop={10}
                onPress={openWhatsappHelp}
                style={styles.whatsappButton}
              >
                <FontAwesome name="whatsapp" size={24} color="#ffffff" />
              </Pressable>
            </View>
            

            {/* ✅ HERO SECTION WITH LOCAL VIDEO */}
            <View style={styles.videoWrap}>
              <VideoView
                player={featuredVideoPlayer}
                style={styles.video}
                contentFit="cover"
              />
            </View>



            <View style={styles.heroPlane}>
              <ScrollView
                ref={feedbackScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToAlignment="center"
                onMomentumScrollEnd={({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
                  if (!feedbackWidth) {
                    return;
                  }
                  const index = Math.round(nativeEvent.contentOffset.x / feedbackWidth);
                  setCurrentFeedbackIndex(index);
                }}
                onLayout={({ nativeEvent }) => setFeedbackWidth(nativeEvent.layout.width)}
              >
                {feedbackImages.map((item) => (
                  <View key={item.id} style={[styles.feedbackImageWrap, { width: feedbackWidth || "100%" }]}> 
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.feedbackImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const sortedCourses = [...item.courses].sort((a, b) => normalizeSortOrder(a.sortOrder) - normalizeSortOrder(b.sortOrder));
          return (
            <View style={styles.categoryCard}>
              <Text style={styles.categoryTitle}>{item.name}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.coursesScrollContent}
              >
                {sortedCourses.map((course) => (
                  <Pressable
                    key={course.id}
                    style={styles.courseCard}
                    onPress={() => openCourse(course.id)}
                  >
                    <View style={styles.courseImageContainer}>
                      {course.imageUrl ? (
                        <Image
                          source={{ uri: course.imageUrl }}
                          style={styles.courseImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.courseImage, styles.courseImagePlaceholder]} />
                      )}
                      {Number(course.rating) > 0 ? (
                        <View style={styles.ratingOverlay}>
                          <View style={styles.ratingStarsRow}>
                            {Array.from({ length: Math.min(Math.round(Number(course.rating) || 0), 5) }).map((_, index) => (
                              <FontAwesome key={index} name="star" size={9} color="#ffd700" />
                            ))}
                          </View>
                          <Text style={styles.ratingText}>{'★'.repeat(Math.floor(course.rating || 0))}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.courseTitle} numberOfLines={2}>
                      {course.courseName || "Untitled Course"}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No categories found</Text>
            <Text style={styles.emptyText}>
              No course data is available from the Hostinger API yet.
            </Text>
          </View>
        }

        ListFooterComponent={
          <View style={styles.footerWrap}>
            <Text style={styles.footerText}>MRC Ayurveda Research Center Lotus Garden Homes VIP, Sunrakh Rd, Vrindavan, Uttar Pradesh 281121</Text>
            <Text style={styles.footerText}>Dr. Abhishek Sharma</Text>
            <Pressable onPress={openWhatsappHelp}>
              <Text style={[styles.footerText, styles.footerPhoneLink]}>Reach out to us @ +91 7351154123</Text>
            </Pressable>
            <View style={styles.socialLinksRow}>
              {socialLinks.map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityLabel={`Open ${item.label}`}
                  accessibilityRole="link"
                  onPress={() => openExternalUrl(item.url)}
                  style={[styles.socialLinkButton, { backgroundColor: item.color }]}
                >
                  <FontAwesome name={item.icon} size={22} color="#ffffff" />
                </Pressable>
              ))}
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  fullWidthVideo: {
    marginHorizontal: -16,
  },

  center: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 15,
  },
  heading: {
    fontSize: 25,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.6,
  },
  headerRow: {
    minHeight: 52,
    gap: 12,
    marginBottom: 8,
    position: "relative",
    width: "100%",
  },
  headerTextWrap: {
    paddingRight: 56,
  },
  whatsappButton: {
    alignItems: "center",
    backgroundColor: "#25d366",
    borderRadius: 22,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    top: 15,
    width: 40,
    marginRight: 16,
  },
  subheading: {
    marginTop: 1,
    fontSize: 12,
    lineHeight: 22,
    color: "#64748b",

  },
  queryLinkWrap: {
    alignSelf: "flex-start",
    marginBottom: 18,
  },
  queryLink: {
    color: "#16a34a",
    fontSize: 14,
    fontWeight: "800",
  },
  listContent: {
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingVertical: 16,
    marginBottom: 18,
    overflow: "hidden",
  },
  heroPlane: {
    backgroundColor: "#020617",
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 18,
  },
  videoWrap: {
    width: "100%",
    aspectRatio: 16 / 9,   // ✅ FIX: proper video proportion
    backgroundColor: "#000",
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 18,
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "#020617",
    borderRadius: 18,
  },
  feedbackImageWrap: {
    width: "100%",
    backgroundColor: "transparent",
    padding: 0,
    alignItems: "center",
  },
  feedbackImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 18,
    backgroundColor: "#334155",
  },
  feedbackImageTitle: {
    marginTop: 12,
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  featuredWrap: {
    marginTop: 14,
  },
  featuredScrollContent: {
    paddingHorizontal: 16,
    paddingRight: 4,
  },
  featuredCard: {
    width: 150,
    marginRight: 12,
  },
  featuredImage: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: "#e5e7eb",
    marginBottom: 10,
  },
  featuredCourseName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    marginBottom: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e7edf5",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.94,
  },
  categoryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e7edf5",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  coursesScrollContent: {
    paddingRight: 16,
  },
  courseCard: {
    width: 120,
    marginRight: 12,
    alignItems: "center",
  },
  courseImageContainer: {
    marginBottom: 8,
  },
  courseImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  courseImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
  },
  ratingOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  ratingText: {
    color: '#ffd700',
    display: "none",
    fontSize: 10,
    fontWeight: 'bold',
  },
  ratingStarsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 1,
  },
  courseTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    lineHeight: 16,
  },
  emptyWrap: {
    paddingVertical: 36,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  footerWrap: {
  padding: 16,
  alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    alignContent: 'center',
    textAlign: 'center',
  },
  footerLink: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  footerPhoneLink: {
    color: '#16a34a',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  socialLinksRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    marginTop: 4,
  },
  socialLinkButton: {
    alignItems: "center",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});
