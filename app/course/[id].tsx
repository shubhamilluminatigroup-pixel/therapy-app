import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CartCheckoutModal from "../../components/CartCheckoutModal";
import SessionList from "../../components/SessionList";
import {
  enrollInCourse,
  getCourse,
  getServicePrice,
  listServiceMonths,
  listMyCourses,
  updateSessionProgress,
} from "../../lib/api";
import { useAuthUid } from "../../lib/useAuth";
import { Course } from "../../types/backend";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useAuthUid();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | undefined>();

  useEffect(() => {
    const loadCourse = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const item = await getCourse(id);
        setCourse(item);
      } catch (error) {
        console.log("Load course error:", error);
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    void loadCourse();
  }, [id]);

  useEffect(() => {
    if (course?.id && uid) {
      void checkEnrollmentStatus();
    }
  }, [course?.id, uid]);

  const checkEnrollmentStatus = async () => {
    if (!course?.id || !uid) return;

    try {
      const myCourses = await listMyCourses();
      const match = myCourses.find((item) => item.id === course.id);
      setIsEnrolled(!!match);
      setEnrollmentId(match?.id);
    } catch (error) {
      console.log("Check enrollment status error:", error);
    }
  };

  const requireLogin = () => {
    Alert.alert("Sign in required", "Please sign in to enroll or purchase courses.", [
      {
        text: "Sign in",
        onPress: () =>
          router.push({
            pathname: "/login",
            params: { redirect: id ? `/course/${id}` : "/(tabs)" },
          }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handlePaymentFailure = () => {
    Alert.alert("Payment Pending", "Payment is not completed yet. You can reopen the payment sheet and check status again.");
  };

  const handleSessionProgressUpdate = async (sessionId: string, position: number, completed: boolean) => {
    if (!course?.id) return;

    try {
      await updateSessionProgress({
        courseId: course.id,
        sessionId,
        position,
        completed,
      });
    } catch (error) {
      console.log("Update session progress error:", error);
    }
  };

  const handleEnroll = async () => {
    if (!course || enrolling || isEnrolled) return;

    if (!uid) {
      requireLogin();
      return;
    }

    try {
      setEnrolling(true);

      if (course.isPaid) {
        const months = await listServiceMonths(course.id).catch(() => []);
        const firstMonth = months[0];
        const priceData = firstMonth
          ? await getServicePrice({ courseId: course.id, monthId: firstMonth.id }).catch(() => null)
          : null;
        const resolvedPrice = Number(priceData?.price ?? firstMonth?.price ?? course.price ?? 0);

        if (Number.isFinite(resolvedPrice) && resolvedPrice <= 0) {
          await enrollInCourse(course.id);
          await checkEnrollmentStatus();
          Alert.alert("Success", "Free course added to My Course.");
          return;
        }

        setShowCartModal(true);
        return;
      }

      await enrollInCourse(course.id);
      await checkEnrollmentStatus();

      Alert.alert("Success", "Free course added to My Course.");
    } catch (error) {
      console.log("Enroll error:", error);
      Alert.alert("Not available", "Unable to start enrollment right now.");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading course...</Text>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Text style={styles.notFoundTitle}>Course not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.push("/(tabs)")}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.topBackRow} onPress={() => router.back()}>
          <Text style={styles.topBackText}>{"<- Back"}</Text>
        </Pressable>

        <View style={styles.courseCard}>
          {course.imageUrl ? (
            <Image
              source={{ uri: course.imageUrl }}
              style={styles.courseImage}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.courseBody}>
            <Text style={styles.courseTitle}>{course.courseName || "Untitled Course"}</Text>

            <View style={styles.instructorRow}>
              <View style={styles.instructorAvatar}>
                <Text style={styles.instructorAvatarText}>DR</Text>
              </View>
              <Text style={styles.instructorName}>{course.instructor || course.subCourseName || "MRC Therapy"}</Text>
            </View>

            {!!course.description && (
              <Text style={styles.descriptionText}>
                <Text style={styles.descriptionLabel}>Description: </Text>
                {course.description}
              </Text>
            )}
          </View>
        </View>

        {isEnrolled && (
          <SessionList
            courseId={course.id}
            enrollmentId={enrollmentId}
            onProgressUpdate={handleSessionProgressUpdate}
          />
        )}

        <Pressable
          style={[styles.enrollButton, (enrolling || isEnrolled) && styles.enrollButtonDisabled]}
          onPress={isEnrolled ? () => router.push("/(tabs)/my-course") : handleEnroll}
          disabled={enrolling}
        >
          <Text style={styles.enrollButtonText}>
            {enrolling
              ? "Processing..."
              : isEnrolled
                ? "Go to My Course"
                : course.isPaid
                  ? "Enroll Now"
                  : "Get Course"
            }
          </Text>
        </Pressable>

        <Pressable style={styles.secondaryBackButton} onPress={() => router.push("/(tabs)")}>
          <Text style={styles.secondaryBackButtonText}>Back to Home</Text>
        </Pressable>
      </ScrollView>

      {course.isPaid && !isEnrolled ? (
        <CartCheckoutModal
          visible={showCartModal}
          course={course}
          onClose={() => setShowCartModal(false)}
          onPaymentFailure={handlePaymentFailure}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 15 },
  notFoundTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 20 },
  topBackRow: { marginBottom: 14, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 2 },
  topBackText: { fontSize: 15, fontWeight: "800", color: "#2563eb" },
  courseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e7edf5",
    marginBottom: 16,
  },
  courseImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#e5e7eb",
  },
  mediaPlaceholder: {
    width: "100%",
    height: 220,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mediaPlaceholderText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  courseBody: {
    padding: 18,
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 30,
  },
  instructorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 12,
  },
  instructorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  instructorAvatarText: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "800",
  },
  instructorName: {
    flex: 1,
    fontSize: 15,
    color: "#475569",
    fontWeight: "700",
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
  },
  descriptionLabel: {
    fontWeight: "800",
    color: "#0f172a",
  },
  enrollButton: { marginTop: 8, backgroundColor: "#0f172a", borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  enrollButtonDisabled: { opacity: 0.7 },
  enrollButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  secondaryBackButton: { marginTop: 12, borderRadius: 16, paddingVertical: 15, alignItems: "center", backgroundColor: "#e2e8f0" },
  secondaryBackButtonText: { color: "#0f172a", fontSize: 15, fontWeight: "800" },
  backButton: { backgroundColor: "#0f172a", paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
  backButtonText: { color: "#ffffff", fontWeight: "800" },
});
