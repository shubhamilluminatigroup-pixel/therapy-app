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
import { HomeCategoryGroup, HomeTopMediaItem } from "../../types/backend";

export default function HomeScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<HomeCategoryGroup[]>([]);
  const [topMedia, setTopMedia] = useState<HomeTopMediaItem[]>([]);
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
  const allCourses = useMemo(
    () => categories.flatMap((category) => category.courses),
    [categories]
  );
  const introVideoCourse = useMemo(
    () => allCourses.find((course) => course.demoVideoUrl) ?? null,
    [allCourses]
  );
  const featuredImageCourses = useMemo(
    () =>
      allCourses
        .filter((course) => course.imageUrl)
        .slice(0, 5),
    [allCourses]
  );
  const introVideoUrl = introVideoCourse?.demoVideoUrl || "";
  const introVideoIsDirectFile = useMemo(() => {
    const normalizedUrl = (introVideoUrl || "").toLowerCase().split("?")[0] ?? "";
    return /\.(mp4|mov|m4v|webm|mkv|m3u8)$/.test(normalizedUrl);
  }, [introVideoUrl]);
  const featuredVideoPlayer = useVideoPlayer(
    introVideoUrl && introVideoIsDirectFile ? { uri: introVideoUrl } : null,
    (player) => {
      player.loop = false;
      player.muted = false;
      player.timeUpdateEventInterval = 1;
    }
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory((prev) => (prev === categoryId ? null : categoryId));
  };

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
              Find the right therapy category for your journey
            </Text>

            {introVideoUrl || featuredImageCourses.length ? (
              <View style={styles.heroCard}>
                {introVideoUrl ? (
                  introVideoIsDirectFile ? (
                    <View style={styles.videoWrap}>
                      <VideoView
                        player={featuredVideoPlayer}
                        style={styles.video}
                        nativeControls
                        contentFit="cover"
                        allowsFullscreen
                      />
                    </View>
                  ) : (
                    <Pressable
                      style={styles.videoFallbackWrap}
                      onPress={() =>
                        introVideoCourse?.id ? openCourse(introVideoCourse.id) : undefined
                      }
                    >
                      {introVideoCourse?.imageUrl ? (
                        <Image
                          source={{ uri: introVideoCourse.imageUrl }}
                          style={styles.videoFallbackImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.videoFallbackPlaceholder} />
                      )}
                    </Pressable>
                  )
                ) : null}

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
                          <Image
                            source={{ uri: course.imageUrl || "" }}
                            style={styles.featuredImage}
                            resizeMode="cover"
                          />
                          <Text style={styles.featuredCourseName} numberOfLines={2}>
                            {course.courseName || "Untitled Course"}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const expanded = expandedCategory === item.id;

          return (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => toggleCategory(item.id)}
            >
              <View style={styles.cardBody}>
                <View style={styles.topRow}>
                  <View style={styles.titleWrap}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {item.courses.length} course
                      {item.courses.length > 1 ? "s" : ""} available
                    </Text>
                  </View>

                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{item.courses.length}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Text style={styles.expandHint}>
                    {expanded ? "Hide courses" : "View courses"}
                  </Text>
                  <Text style={styles.arrow}>{expanded ? "-" : "+"}</Text>
                </View>

                {expanded ? (
                  <View style={styles.expandedWrap}>
                    {item.courses.map((course) => (
                      <View key={course.id} style={styles.courseItem}>
                        {course.imageUrl ? (
                          <Image
                            source={{ uri: course.imageUrl }}
                            style={styles.courseImage}
                            resizeMode="cover"
                          />
                        ) : null}

                        <View style={styles.courseTopRow}>
                          <View style={styles.courseTextWrap}>
                            <Text style={styles.courseTitle}>
                              {course.courseName || "Untitled Course"}
                            </Text>
                          </View>
                        </View>

                        <Pressable
                          style={styles.courseButton}
                          onPress={() => openCourse(course.id)}
                        >
                          <Text style={styles.courseButtonText}>Open Course</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </Pressable>
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
    marginTop: 8,
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
    height: 250,
    overflow: "hidden",
    backgroundColor: "#020617",
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: "#020617",
  },
  videoFallbackWrap: {
    width: "100%",
    height: 250,
    overflow: "hidden",
    backgroundColor: "#020617",
  },
  videoFallbackImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#111827",
  },
  videoFallbackPlaceholder: {
    flex: 1,
    backgroundColor: "#111827",
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
  cardBody: {
    padding: 18,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  titleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 30,
  },
  cardSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  countBadge: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  countText: {
    color: "#15803d",
    fontWeight: "800",
    fontSize: 14,
  },
  actionRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expandHint: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
  },
  arrow: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2563eb",
    lineHeight: 22,
  },
  expandedWrap: {
    marginTop: 16,
  },
  courseItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8eef5",
  },
  courseImage: {
    width: "100%",
    height: 148,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: "#e5e7eb",
  },
  courseTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  courseTextWrap: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 24,
  },
  courseButton: {
    marginTop: 10,
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  courseButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
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
