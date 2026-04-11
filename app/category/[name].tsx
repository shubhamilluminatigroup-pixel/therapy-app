import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { listHomeCategories } from "../../lib/api";
import { Course, HomeCategoryGroup } from "../../types/backend";

export default function CategoryDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [category, setCategory] = useState<HomeCategoryGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategoryCourses = async () => {
      if (!name) return;

      try {
        const rows = await listHomeCategories();
        const selectedCategory = rows.find((item) => item.id === name) ?? null;
        setCategory(selectedCategory);

        const activeCourses = (selectedCategory?.courses ?? [])
          .filter((item) => item.isActive !== false)
          .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
        setCourses(activeCourses);
      } catch (error) {
        console.log("Load category courses error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCategoryCourses();
  }, [name]);

  const openCourse = (course: Course) => {
    router.push(`/course/${course.id}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading courses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>{"<- Back"}</Text>
      </Pressable>

      <Text style={styles.heading}>{category?.name || "Category"}</Text>
      <Text style={styles.subheading}>
        {courses.length} course{courses.length > 1 ? "s" : ""} available
      </Text>

      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
            onPress={() => openCourse(item)}
          >
            <Text style={styles.courseTitle}>{item.courseName}</Text>

            {!!item.subCourseName && (
              <Text style={styles.subCourse}>{item.subCourseName}</Text>
            )}

            {!!item.description && (
              <Text style={styles.description}>{item.description}</Text>
            )}

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {item.contentType ? item.contentType.toUpperCase() : "MIXED"}
              </Text>
              <Text style={styles.metaDot}>.</Text>
              <Text style={styles.metaText}>
                {item.language?.toUpperCase() || "NA"}
              </Text>
              <Text style={styles.metaDot}>.</Text>
              <Text style={styles.priceText}>
                {item.isPaid ? `Rs ${item.price ?? 0}` : "Free"}
              </Text>
            </View>

            <Pressable
              style={styles.enrollButton}
              onPress={() => openCourse(item)}
            >
              <Text style={styles.enrollButtonText}>View Course</Text>
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No courses found</Text>
            <Text style={styles.emptyText}>
              This category does not have visible courses yet.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#475569",
    fontSize: 15,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 14,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subheading: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 15,
    color: "#64748b",
  },
  listContent: {
    paddingBottom: 28,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardPressed: {
    opacity: 0.78,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  subCourse: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
  },
  metaRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  metaDot: {
    marginHorizontal: 8,
    color: "#94a3b8",
    fontWeight: "700",
  },
  priceText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
  },
  enrollButton: {
    marginTop: 14,
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  enrollButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  emptyWrap: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
});
