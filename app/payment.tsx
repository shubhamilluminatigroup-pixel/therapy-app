import { confirmAppPayment, getAppPaymentStatus } from "@/lib/api";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentScreen() {
  const {
    merchantReferenceId,
    amount,
    courseName,
    redirectUrl,
  } = useLocalSearchParams<{
    merchantReferenceId?: string;
    amount?: string;
    courseName?: string;
    redirectUrl?: string;
  }>();

  const [paymentState, setPaymentState] = useState("PENDING");
  const [paymentMessage, setPaymentMessage] = useState("Waiting for the payment confirmation...");
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const statusTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const completePayment = useCallback(async () => {
    if (!merchantReferenceId) return;
    await confirmAppPayment(merchantReferenceId);
    Alert.alert("Payment successful", "Your course has been added successfully.", [
      { text: "Open My Course", onPress: () => router.replace("/(tabs)/my-course") },
    ]);
  }, [merchantReferenceId]);

  const refreshPaymentState = useCallback(async () => {
    if (!merchantReferenceId) return "PENDING";

    const data = await getAppPaymentStatus(merchantReferenceId);
    const nextState = data.payment_state || "PENDING";
    setPaymentState(nextState);
    setPaymentMessage(
      nextState === "COMPLETED"
        ? "Payment completed successfully."
        : nextState === "FAILED" || nextState === "EXPIRED" || nextState === "CANCELLED"
        ? `Payment ${nextState.toLowerCase()}. You can try again.`
        : "Your payment is being processed..."
    );
    
    // Reset processing flag when payment fails/cancels so user can retry
    if (nextState === "FAILED" || nextState === "CANCELLED" || nextState === "EXPIRED") {
      setProcessingPayment(false);
    }
    
    return nextState;
  }, [merchantReferenceId]);

  const initiatePhonePePayment = useCallback(async () => {
    if (!merchantReferenceId || !amount || !redirectUrl) return;
    try {
      setProcessingPayment(true);
      setPaymentMessage("Opening PhonePe checkout...");

      console.log("Opening PhonePe checkout:", redirectUrl);

      const canOpen = await Linking.canOpenURL(redirectUrl);
      if (canOpen) {
        await Linking.openURL(redirectUrl);
        setPaymentMessage("PhonePe checkout opened in browser. Complete payment and return.");
        // Don't set processingPayment to false here - wait for user to return
      } else {
        throw new Error("Unable to open PhonePe checkout");
      }
    } catch (error) {
      console.log("Initiate payment error:", error);
      setPaymentMessage(`Error: ${error instanceof Error ? error.message : "Unable to open checkout"}`);
      setProcessingPayment(false);
      Alert.alert("Payment Error", error instanceof Error ? error.message : "Unable to initiate payment");
    }
  }, [merchantReferenceId, amount, redirectUrl]);

  useEffect(() => {
    if (!merchantReferenceId) return;

    void refreshPaymentState();

    statusTimer.current = setInterval(async () => {
      try {
        const nextState = await refreshPaymentState();
        if (nextState === "COMPLETED") {
          clearInterval(statusTimer.current!);
          statusTimer.current = null;
          await completePayment();
        }
        if (nextState === "FAILED" || nextState === "EXPIRED" || nextState === "CANCELLED") {
          clearInterval(statusTimer.current!);
          statusTimer.current = null;
        }
      } catch (error) {
        console.log("Payment status polling error:", error);
      }
    }, 4000);

    return () => {
      if (statusTimer.current) {
        clearInterval(statusTimer.current);
        statusTimer.current = null;
      }
    };
  }, [completePayment, merchantReferenceId, refreshPaymentState]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active") void refreshPaymentState();
    });
    return () => subscription.remove();
  }, [refreshPaymentState]);

  const handleCheckStatus = async () => {
    if (!merchantReferenceId) return;
    try {
      setCheckingPayment(true);
      const nextState = await refreshPaymentState();
      if (nextState === "COMPLETED") {
        await completePayment();
        return;
      }
      Alert.alert("Payment status", `Current payment state: ${nextState}`);
    } catch (error) {
      console.log("Check payment status error:", error);
      Alert.alert("Status error", error instanceof Error ? error.message : "Unable to check payment status.");
    } finally {
      setCheckingPayment(false);
    }
  };

  if (!merchantReferenceId || !amount || !redirectUrl) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Payment page unavailable</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/(tabs)")}>
          <Text style={styles.backButtonText}>{"<- Back"}</Text>
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle}>Payment</Text>
          <Text style={styles.headerState}>{paymentState}</Text>
        </View>
      </View>

      <View style={styles.summaryBar}>
        <Text style={styles.amountText}>Rs {amount || "0.00"}</Text>
        <Text style={styles.courseText} numberOfLines={1}>
          {courseName || "Course Payment"}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.sdkCard}>
          <Text style={styles.sectionTitle}>PhonePe Payment</Text>
          <Text style={styles.helperText}>
            {paymentState === "COMPLETED"
              ? "✓ Payment completed successfully!"
              : paymentState === "FAILED" || paymentState === "CANCELLED" || paymentState === "EXPIRED"
              ? "Payment was not completed. Please try again."
              : `Click the button below to pay Rs ${amount || "0.00"} via PhonePe`}
          </Text>
          {paymentState !== "COMPLETED" && (
            <TouchableOpacity
              style={[styles.paymentButton, processingPayment && styles.disabledButton]}
              onPress={() => void initiatePhonePePayment()}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <>
                  <ActivityIndicator color="#ffffff" />
                  <Text style={styles.paymentButtonText}>Opening PhonePe...</Text>
                </>
              ) : paymentState === "FAILED" || paymentState === "CANCELLED" || paymentState === "EXPIRED" ? (
                <Text style={styles.paymentButtonText}>Retry Payment - Rs {amount || "0.00"}</Text>
              ) : (
                <Text style={styles.paymentButtonText}>Pay Rs {amount || "0.00"}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Payment Status</Text>
          <Text style={styles.statusValue}>{paymentState}</Text>
          {!!merchantReferenceId && (
            <Text style={styles.referenceText}>Reference: {merchantReferenceId}</Text>
          )}
          <Text style={styles.helperText}>{paymentMessage}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.checkButton, checkingPayment && styles.disabledButton]}
          onPress={() => void handleCheckStatus()}
          disabled={checkingPayment}
        >
          {checkingPayment ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.checkButtonText}>Check Status</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", padding: 24 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12,
    gap: 12, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0",
  },
  backButton: { paddingVertical: 6, paddingHorizontal: 4 },
  backButtonText: { fontSize: 15, fontWeight: "800", color: "#2563eb" },
  headerMeta: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  headerState: { marginTop: 2, fontSize: 12, color: "#2563eb", fontWeight: "700" },
  summaryBar: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#eef2ff", borderBottomWidth: 1, borderBottomColor: "#dbeafe",
  },
  amountText: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  courseText: { marginTop: 2, fontSize: 13, color: "#475569" },
  content: { flex: 1, padding: 16, gap: 16 },
  sdkCard: {
    backgroundColor: "#ffffff", borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  statusCard: {
    backgroundColor: "#ffffff", borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: "#e2e8f0",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  statusValue: { fontSize: 15, fontWeight: "800", color: "#2563eb" },
  referenceText: { marginTop: 10, fontSize: 12, color: "#475569" },
  helperText: { marginTop: 10, fontSize: 13, lineHeight: 19, color: "#64748b" },
  paymentButton: {
    marginTop: 16, backgroundColor: "#2563eb", borderRadius: 14,
    paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10,
  },
  paymentButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  footer: { padding: 16, backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  checkButton: { backgroundColor: "#0f172a", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  checkButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  button: { marginTop: 16, backgroundColor: "#0f172a", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: "#ffffff", fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  disabledButton: { opacity: 0.7 },
});
