import { changePasswordWithApi, getAccountOverview, logoutWithApi } from "@/lib/api";
import { useAuthUser } from "@/lib/useAuth";
import { MyCourseItem } from "@/types/backend";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountScreen() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [userData, setUserData] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<MyCourseItem[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !user?.uid) {
      setUserData(null);
      setEnrollments([]);
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (!loggingOut) {
        router.push({
          pathname: "/login",
          params: { redirect: "/(tabs)/account" },
        });
      }
      return;
    }

    if (user?.uid) {
      setLoggingOut(false);
      void loadAccountData();
    }
  }, [loading, loggingOut, router, user?.uid]);

  const loadAccountData = async () => {
    if (!user?.uid) return;

    try {
      const overview = await getAccountOverview();
      setUserData(overview.user);
      setEnrollments(overview.myCourses);
    } catch (error) {
      console.log("Load account data error:", error);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing fields", "Please enter current password, new password and confirmation.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Password mismatch", "New password and confirmation don't match.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    try {
      setChangingPassword(true);
      await changePasswordWithApi(currentPassword, newPassword);
      Alert.alert("Success", "Password changed successfully.");
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.log("Change password error:", error);
      Alert.alert("Not available", error.message || "This backend does not support password changes from the app.");
    } finally {
      setChangingPassword(false);
    }
  };

  function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          setUserData(null);
          setEnrollments([]);
          setShowChangePassword(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          await logoutWithApi();
          router.replace("/(tabs)");
        },
      },
    ]);
  }

  if (!loading && !user?.uid && !loggingOut) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.signedOutWrap}>
          <Text style={styles.header}>Account</Text>
          <View style={styles.signedOutCard}>
            <Text style={styles.signedOutTitle}>Sign in to view your account</Text>
            <Text style={styles.signedOutText}>
              Your profile, password settings, and course details will appear here after login.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Account</Text>

        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </Text>
          </View>
          <Text style={styles.email}>
            {loading ? "Loading..." : user?.email ?? "Unknown user"}
          </Text>
          <Text style={styles.uid}>User ID: {user?.uid ?? "-"}</Text>
          {userData && (
            <View style={styles.userDetails}>
              <Text style={styles.detailText}>Name: {userData.fullName || "Not set"}</Text>
              <Text style={styles.detailText}>Phone: {userData.phone || "Not set"}</Text>
              <Text style={styles.detailText}>Role: {userData.isStaff ? "admin" : "user"}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          {userData?.isStaff ? (
            <TouchableOpacity
              style={styles.adminBtn}
              onPress={() => router.push("/(tabs)/admin")}
            >
              <Text style={styles.adminBtnText}>Open Admin Panel</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowChangePassword(!showChangePassword)}
          >
            <Text style={styles.actionBtnText}>Change Password</Text>
          </TouchableOpacity>

          {showChangePassword && (
            <View style={styles.changePasswordCard}>
              <TextInput
                style={styles.input}
                placeholder="Current Password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                style={[styles.saveBtn, changingPassword && styles.disabledBtn]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                <Text style={styles.saveBtnText}>
                  {changingPassword ? "Changing..." : "Change Password"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Courses ({enrollments.length})</Text>
          {enrollments.length === 0 ? (
            <Text style={styles.emptyText}>No course enrollments yet</Text>
          ) : (
            enrollments.map((enrollment) => (
              <View key={enrollment.id} style={styles.historyItem}>
                <Text style={styles.historyTitle}>{enrollment.courseName || "Unknown Course"}</Text>
                <Text style={styles.historyDetail}>Status: {enrollment.paymentStatus || "active"}</Text>
                <Text style={styles.historyDate}>
                  Enrolled: {enrollment.enrolledAt ? new Date(enrollment.enrolledAt).toLocaleDateString() : "Unknown date"}
                </Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  header: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#d1fae5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "700", color: "#065f46" },
  email: { fontSize: 16, fontWeight: "600", color: "#111827", marginBottom: 4 },
  uid: { fontSize: 11, color: "#9ca3af" },
  userDetails: {
    marginTop: 16,
    alignItems: "center",
  },
  detailText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  actionBtn: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  adminBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  adminBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  changePasswordCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  saveBtn: {
    backgroundColor: "#10b981",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  historyItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  historyDetail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 16,
    fontStyle: "italic",
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
  },
  logoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  signedOutWrap: {
    flex: 1,
  },
  signedOutCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  signedOutTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  signedOutText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7280",
  },
});
