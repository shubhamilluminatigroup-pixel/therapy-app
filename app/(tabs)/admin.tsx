import {
  listFeedbackImages,
  uploadFeedbackImage,
  deleteFeedbackImage,
  editFeedbackImage,
  listCourses,
  listHomeCategories,
  updateCourseDetailsBulk,
} from "@/lib/api";
import { useAuthUser } from "@/lib/useAuth";
import { FeedbackImageItem, CourseItem } from "@/types/backend";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();

  const [activeTab, setActiveTab] = useState<"feedback" | "courses">("feedback");

  // Feedback Images State
  const [feedbackRows, setFeedbackRows] = useState<FeedbackImageItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackEditingId, setFeedbackEditingId] = useState("");
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState("");

  // Course management State
  const [courseRows, setCourseRows] = useState<CourseItem[]>([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseSaving, setCourseSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user?.uid) {
      router.replace({
        pathname: "/login",
        params: { redirect: "/(tabs)/admin" },
      });
      return;
    }

    if (!authLoading && user?.uid) {
      void loadFeedbackData();
      void loadCourseData();
    }
  }, [authLoading, router, user?.uid, activeTab]);

  const loadFeedbackData = async (forceRefresh = false) => {
    try {
      setFeedbackLoading(true);
      const data = await listFeedbackImages(forceRefresh);
      setFeedbackRows(data);
    } catch (error: any) {
      console.log("Load feedback data error:", error);
      if (forceRefresh) {
        Alert.alert("Refresh failed", error?.message || "Unable to refresh feedback list from server.");
      }
    } finally {
      setFeedbackLoading(false);
    }
  };

  const loadCourseData = async () => {
    try {
      setCourseLoading(true);
      const data = await listCourses();
      setCourseRows(data);
    } catch (error) {
      console.log("Load courses error:", error);
    } finally {
      setCourseLoading(false);
    }
  };

  const resetFeedbackForm = () => {
    setFeedbackEditingId("");
    setFeedbackTitle("");
    setSelectedImageUri("");
  };

  const handleFeedbackEdit = (item: FeedbackImageItem) => {
    setFeedbackEditingId(item.id);
    setFeedbackTitle(item.title || "");
    setSelectedImageUri(item.imageUrl);
    setActiveTab("feedback");
  };

  const pickImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleFeedbackSave = async () => {
    if (!selectedImageUri && !feedbackEditingId) {
      Alert.alert("Error", "Please select an image first.");
      return;
    }

    try {
      setFeedbackSaving(true);
      if (feedbackEditingId) {
        await editFeedbackImage({
          id: feedbackEditingId,
          title: feedbackTitle,
          uri: selectedImageUri.startsWith("http") ? undefined : selectedImageUri,
        });
      } else {
        await uploadFeedbackImage(feedbackTitle, selectedImageUri);
      }

      Alert.alert("Success", "Feedback image saved.");
      resetFeedbackForm();
      await loadFeedbackData(true);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save feedback image.");
    } finally {
      setFeedbackSaving(false);
    }
  };

  const handleBulkSave = async () => {
    try {
      setCourseSaving(true);
      await updateCourseDetailsBulk(courseRows.map(c => ({
        id: c.id,
        screen_order: Number.isFinite(Number(c.screen_order)) ? Number(c.screen_order) : 0,
        rating: Number.isFinite(Number(c.rating)) ? Number(c.rating) : 0,
      })));

      Alert.alert("Success", "All course changes saved.");
      await listHomeCategories(true).catch(() => []);
      await loadCourseData();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update.");
    } finally {
      setCourseSaving(false);
    }
  };

  const handleFeedbackDelete = (id: string) => {
    Alert.alert("Delete", "Are you sure you want to delete this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFeedbackImage(id);
            await loadFeedbackData(true);
          } catch (error: any) {
            Alert.alert("Error", error?.message || "Failed to delete.");
          }
        },
      },
    ]);
  };

  if (authLoading || (feedbackLoading && feedbackRows.length === 0 && activeTab === "feedback")) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.helperText}>Loading admin panel...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "feedback" && styles.activeTab]}
          onPress={() => setActiveTab("feedback")}
        >
          <Text style={[styles.tabText, activeTab === "feedback" && styles.activeTabText]}>Feedback</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "courses" && styles.activeTab]}
          onPress={() => setActiveTab("courses")}
        >
          <Text style={[styles.tabText, activeTab === "courses" && styles.activeTabText]}>Course Master</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {activeTab === "feedback" ? (
          <>
            <Text style={styles.heading}>Feedback Images</Text>
            <Text style={styles.subheading}>Upload or edit feedback images for the app.</Text>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{feedbackEditingId ? "Edit Feedback Image" : "Add New Image"}</Text>
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} placeholder="Image Title" placeholderTextColor="#94a3b8" value={feedbackTitle} onChangeText={setFeedbackTitle} />
              <Text style={styles.label}>Image</Text>
              {selectedImageUri ? (
                <Image source={{ uri: selectedImageUri }} style={styles.previewImage} />
              ) : null}
              <Pressable style={styles.secondaryButton} onPress={pickImage}>
                <Text style={styles.secondaryButtonText}>{selectedImageUri ? "Change Image" : "Select Image"}</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, { marginTop: 12 }, feedbackSaving && styles.buttonDisabled]} onPress={() => void handleFeedbackSave()} disabled={feedbackSaving}>
                <Text style={styles.primaryButtonText}>{feedbackSaving ? "Saving..." : feedbackEditingId ? "Update Feedback" : "Upload Feedback"}</Text>
              </Pressable>
              {feedbackEditingId ? (
                <Pressable style={styles.secondaryButton} onPress={resetFeedbackForm}>
                  <Text style={styles.secondaryButtonText}>Cancel Edit</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.card}>
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Feedback List</Text>
                <Pressable disabled={feedbackLoading} onPress={() => void loadFeedbackData(true)}>
                  <Text style={[styles.refreshText, feedbackLoading && styles.refreshTextDisabled]}>
                    {feedbackLoading ? "Refreshing..." : "Refresh"}
                  </Text>
                </Pressable>
              </View>
              {feedbackRows.map((item) => (
                <View key={item.id} style={styles.rowCard}>
                  <Image source={{ uri: item.imageUrl }} style={styles.listImage} />
                  <Text style={styles.rowTitle}>{item.title || "No Title"}</Text>
                  <Text style={styles.rowMeta}>{item.createdAt}</Text>
                  <View style={styles.buttonRow}>
                    <Pressable style={[styles.editButton, { flex: 1, marginRight: 8 }]} onPress={() => handleFeedbackEdit(item)}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable style={[styles.deleteButton, { flex: 1 }]} onPress={() => handleFeedbackDelete(item.id)}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.heading}>Course Categorizer</Text>
                <Text style={styles.subheading}>Manage Order and Ratings for all courses.</Text>
              </View>
              <Pressable style={[styles.saveAllButton, courseSaving && styles.buttonDisabled]} onPress={() => void handleBulkSave()} disabled={courseSaving}>
                <Text style={styles.saveAllButtonText}>{courseSaving ? "..." : "Save All"}</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 3 }]}>Course Name</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Order</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Rating</Text>
              </View>
              {courseRows.length === 0 ? (
                <Text style={styles.helperText}>No courses found.</Text>
              ) : (
                courseRows.map((item, index) => (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={[styles.courseNameText, { flex: 3 }]} numberOfLines={2}>{item.name}</Text>
                    <TextInput
                      style={[styles.tableInput, { flex: 1 }]}
                      keyboardType="number-pad"
                      value={String(item.screen_order)}
                      onChangeText={(val) => {
                        const newRows = [...courseRows];
                        newRows[index] = {
                          ...newRows[index],
                          screen_order: Number.isFinite(parseInt(val || "0", 10)) ? parseInt(val || "0", 10) : 0,
                        };
                        setCourseRows(newRows);
                      }}
                    />
                    <TextInput
                      style={[styles.tableInput, { flex: 1 }]}
                      keyboardType="numeric"
                      value={String(item.rating)}
                      onChangeText={(val) => {
                        const newRows = [...courseRows];
                        const nextRating = Math.max(0, Math.min(5, parseFloat(val || "0") || 0));
                        newRows[index] = {
                          ...newRows[index],
                          rating: nextRating,
                        };
                        setCourseRows(newRows);
                      }}
                    />
                  </View>
                ))
              )}
              <Pressable style={[styles.primaryButton, { marginTop: 20 }, courseSaving && styles.buttonDisabled]} onPress={() => void handleBulkSave()} disabled={courseSaving}>
                <Text style={styles.primaryButtonText}>{courseSaving ? "Saving..." : "Save All Changes"}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  tabBar: { flexDirection: "row", backgroundColor: "#ffffff", borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  activeTab: { borderBottomWidth: 3, borderColor: "#16a34a" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#64748b" },
  activeTabText: { color: "#16a34a", fontWeight: "800" },
  center: { flex: 1, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center" },
  heading: { fontSize: 28, fontWeight: "800", color: "#0f172a", paddingHorizontal: 16, paddingTop: 16 },
  subheading: { marginTop: 8, marginBottom: 18, fontSize: 15, color: "#64748b", paddingHorizontal: 16 },
  card: { backgroundColor: "#ffffff", borderRadius: 22, padding: 18, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: "#0f172a", backgroundColor: "#ffffff", marginBottom: 14 },
  primaryButton: { backgroundColor: "#0f172a", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  secondaryButton: { marginTop: 2, borderRadius: 14, paddingVertical: 14, alignItems: "center", backgroundColor: "#e2e8f0" },
  secondaryButtonText: { color: "#0f172a", fontSize: 15, fontWeight: "800" },
  buttonDisabled: { opacity: 0.7 },
  helperText: { color: "#64748b", fontSize: 14, textAlign: "center" },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  refreshText: { color: "#2563eb", fontWeight: "700", fontSize: 14 },
  refreshTextDisabled: { color: "#94a3b8" },
  rowCard: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 16, padding: 14, marginTop: 12, backgroundColor: "#f8fafc" },
  rowTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  rowMeta: { fontSize: 13, color: "#475569", marginBottom: 4 },
  editButton: { marginTop: 12, backgroundColor: "#dbeafe", borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  editButtonText: { color: "#1d4ed8", fontSize: 14, fontWeight: "800" },
  previewImage: { width: "100%", height: 180, borderRadius: 14, marginBottom: 12, backgroundColor: "#cbd5e1" },
  listImage: { width: "100%", height: 120, borderRadius: 12, marginBottom: 10, backgroundColor: "#cbd5e1" },
  buttonRow: { flexDirection: "row", marginTop: 4 },
  deleteButton: { marginTop: 12, backgroundColor: "#fee2e2", borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  deleteButtonText: { color: "#dc2626", fontSize: 14, fontWeight: "800" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 16 },
  saveAllButton: { backgroundColor: "#16a34a", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  saveAllButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  tableHeader: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginBottom: 10 },
  tableHeaderText: { fontSize: 12, fontWeight: "800", color: "#64748b", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", gap: 8 },
  courseNameText: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  tableInput: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, fontSize: 14, color: "#0f172a", textAlign: "center", backgroundColor: "#f8fafc" },
});
