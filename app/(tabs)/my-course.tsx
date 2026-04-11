import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listMyCourses } from "../../lib/api";
import { useAuthUser } from "../../lib/useAuth";
import { MyCourseItem } from "../../types/backend";

export default function MyCourseScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const uid = user?.uid ?? null;
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<MyCourseItem[]>([]);

  useEffect(() => {
    if (authLoading) return;

    if (!uid) {
      router.push({
        pathname: "/login",
        params: { redirect: "/(tabs)/my-course" },
      });
    }

    const loadMyCourses = async () => {
      if (!uid) {
        setCourses([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const enrolledCourses = await listMyCourses();
        setCourses(enrolledCourses);
      } catch (error) {
        console.log("Load my courses error:", error);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    void loadMyCourses();
  }, [authLoading, router, uid]);

  const openCourse = (courseId: string) => {
    router.push(`/course/${courseId}`);
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading your courses...</Text>
      </SafeAreaView>
    );
  }

  if (!uid) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Text style={styles.emptyTitle}>Sign in to see your courses</Text>
        <Pressable
          style={styles.openButton}
          onPress={() =>
            router.push({
              pathname: "/login",
              params: { redirect: "/(tabs)/my-course" },
            })
          }
        >
          <Text style={styles.openButtonText}>Go to Login</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.heading}>My Course</Text>
      <Text style={styles.subheading}>All enrolled courses will appear here</Text>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.courseRow}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.courseImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.courseImage, styles.imagePlaceholder]}>
                  <Text style={styles.imagePlaceholderText}>IMG</Text>
                </View>
              )}

              <View style={styles.cardTextWrap}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.courseName || "Untitled Course"}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {item.paymentStatus?.toUpperCase() || "ENROLLED"}
                    </Text>
                  </View>
                </View>
                {!!item.subCourseName && (
                  <Text style={styles.cardSubTitle}>{item.subCourseName}</Text>
                )}
                {!!item.categoryName && (
                  <Text style={styles.cardCategory}>{item.categoryName}</Text>
                )}
                {!!item.enrolledAt && (
                  <Text style={styles.enrolledAtText}>
                    Added: {String(item.enrolledAt).split("T")[0]}
                  </Text>
                )}
              </View>
            </View>

            <Pressable style={styles.openButton} onPress={() => openCourse(item.id)}>
              <Text style={styles.openButtonText}>Open Course</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No courses enrolled yet</Text>
            <Text style={styles.emptyText}>Go to Home, open a course, and tap Enroll.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", paddingHorizontal: 16, paddingTop: 8 },
  center: { flex: 1, backgroundColor: "#f5f7fb", justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 15 },
  heading: { fontSize: 30, fontWeight: "800", color: "#0f172a", letterSpacing: -0.6 },
  subheading: { marginTop: 8, marginBottom: 18, fontSize: 15, lineHeight: 22, color: "#64748b" },
  listContent: { paddingBottom: 32 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e7edf5",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  courseRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  courseImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    color: "#64748b",
    fontWeight: "800",
  },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, width: "100%" },
  cardTextWrap: { flex: 1, minWidth: 0 },
  cardTitle: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: "800", color: "#0f172a", lineHeight: 24, paddingRight: 4 },
  cardSubTitle: { marginTop: 5, fontSize: 13, fontWeight: "700", color: "#16a34a" },
  cardCategory: { marginTop: 6, fontSize: 13, color: "#64748b" },
  enrolledAtText: { marginTop: 6, fontSize: 12, color: "#94a3b8", fontWeight: "700" },
  statusBadge: { flexShrink: 0, backgroundColor: "#eff6ff", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 92 },
  statusText: { color: "#2563eb", fontSize: 11, fontWeight: "800" },
  openButton: { marginTop: 14, backgroundColor: "#0f172a", borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  openButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  emptyWrap: { paddingVertical: 40, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  emptyText: { marginTop: 8, fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 },
});
