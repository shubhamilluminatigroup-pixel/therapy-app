import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listHomeCategories, listHomeTopMedia } from "../../lib/api";

// ✅ LOCAL VIDEO (place file in assets/videos/)
const localIntroVideo = require("../../assets/images/intro.mp4");

export default function HomeScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [topMedia, setTopMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const [categoryRows, topMediaRows] = await Promise.all([
          listHomeCategories(),
          listHomeTopMedia().catch((error) => {
            console.log("Load top media error:", error);
            return [];
          }),
        ]);

        setCategories(categoryRows);
        setTopMedia(topMediaRows);
      } catch (error) {
        console.log("Load courses error:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadCourses();
  }, []);

  const groupedCategories = useMemo(() => categories, [categories]);

  const normalizeSortOrder = (value: number | string | undefined | null) => {
    if (value === null || value === undefined || value === "") {
      return 999999;
    }
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 999999;
  };

  const allCourses = useMemo(
    () => categories
      .flatMap((category) => category.courses)
      .sort((a, b) => normalizeSortOrder(a.sortOrder) - normalizeSortOrder(b.sortOrder)),
    [categories]
  );

  const featuredImageCourses = useMemo(
    () =>
      allCourses
        .filter((course) => course.imageUrl)
        .slice(0, 5),
    [allCourses]
  );

  // ✅ VIDEO PLAYER USING LOCAL FILE
  const [isFinished, setIsFinished] = useState(false);

  const featuredVideoPlayer = useVideoPlayer(localIntroVideo, (player) => {
    player.loop = false;        // ❌ no loop
    player.muted = false;       // 🔊 sound ON
    player.play();              // ▶️ autoplay

    player.addListener("playToEnd", () => {
      setIsFinished(true);      // ✅ show replay button
    });
  });

  const openCourse = (courseId: string) => {
    router.push(`/course/${courseId}`);
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
            <Text style={styles.heading}>Explore Courses</Text>
            <Text style={styles.subheading}>
              Find the right therapy  for your journey
            </Text>

            {/* ✅ HERO SECTION WITH LOCAL VIDEO */}
            <View style={styles.videoWrap}>
              <VideoView
                player={featuredVideoPlayer}
                style={styles.video}
                contentFit="cover"
              />
            </View>



            <View style={styles.heroCard}>



              {featuredImageCourses.length ? (
                <View style={styles.featuredWrap}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredScrollContent}
                  >
                    {featuredImageCourses.map((course) => (
                      <Pressable
                        key={course.id}
                        style={({ pressed }) => [
                          styles.featuredCard,
                          pressed && styles.cardPressed,
                        ]}
                        onPress={() => openCourse(course.id)}
                      >
                        {course.imageUrl ? (
                          <Image
                            source={{ uri: course.imageUrl }}
                            style={styles.featuredImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.featuredImage, styles.featuredImagePlaceholder]} />
                        )}
                        <Text style={styles.featuredCourseName} numberOfLines={2}>
                          {course.courseName || "Untitled Course"}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
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
                      {course.rating ? (
                        <View style={styles.ratingOverlay}>
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
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.6,
  },
  subheading: {
    marginTop: -6,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
    color: "#64748b",

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
  videoWrap: {
    width: "100%",
    aspectRatio: 16 / 9,   // ✅ FIX: proper video proportion
    backgroundColor: "#000",

    marginBottom: 16
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "#020617",
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
    fontSize: 10,
    fontWeight: 'bold',
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
});