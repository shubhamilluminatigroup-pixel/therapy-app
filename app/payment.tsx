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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentScreen() {
  const {
    redirectUrl,
    merchantReferenceId,
    amount,
    courseName,
    browserOpened: browserOpenedParam,
    transactionStatus,
    transactionError,
  } = useLocalSearchParams<{
    redirectUrl?: string;
    merchantReferenceId?: string;
    amount?: string;
    courseName?: string;
    browserOpened?: string;
    transactionStatus?: string;
    transactionError?: string;
  }>();

  const [paymentState, setPaymentState] = useState("PENDING");
  const [paymentMessage, setPaymentMessage] = useState("Waiting for the payment confirmation...");
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [openingBrowser, setOpeningBrowser] = useState(false);
  const [browserOpened, setBrowserOpened] = useState(browserOpenedParam === "1");
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
        : nextState === "FAILED" || nextState === "EXPIRED"
        ? `Payment ${nextState.toLowerCase()}.`
        : "Complete your payment in the browser, then return here."
    );
    return nextState;
  }, [merchantReferenceId]);

  const openPaymentBrowser = useCallback(async () => {
    if (!redirectUrl || openingBrowser) return;
    try {
      setOpeningBrowser(true);
      setPaymentMessage("Opening the payment page in your browser...");

      if (
        redirectUrl.includes("api.phonepe.com/apis/pg/checkout/ui/") &&
        !redirectUrl.includes("token=")
      ) {
        throw new Error("PhonePe returned an invalid checkout link (missing token).");
      }

      const canOpen = await Linking.canOpenURL(redirectUrl);
      if (!canOpen) throw new Error("Unable to open payment URL");
      await Linking.openURL(redirectUrl);
      setBrowserOpened(true);
      setPaymentMessage("The payment page is open in your browser. Return here after completing payment.");
    } catch (error) {
      console.log("Open payment browser error:", error);
      Alert.alert("Payment page error", "Unable to open the payment page in the browser.");
    } finally {
      setOpeningBrowser(false);
    }
  }, [openingBrowser, redirectUrl]);

  useEffect(() => {
    if (!redirectUrl || browserOpened) return;
    void openPaymentBrowser();
  }, [browserOpened, openPaymentBrowser, redirectUrl]);

  useEffect(() => {
    if (transactionStatus === "SUCCESS") {
      setPaymentMessage("PhonePe returned control to the app. Checking your payment confirmation now.");
      return;
    }
    if (transactionStatus === "FAILURE" || transactionStatus === "INTERRUPTED" || transactionStatus === "INTERUPTED") {
      setPaymentMessage(transactionError || "The PhonePe checkout was interrupted. You can retry or check the status.");
      return;
    }
    if (transactionStatus === "BROWSER_FALLBACK") {
      setPaymentMessage(transactionError || "Native checkout was unavailable, so the browser fallback has been opened.");
    }
  }, [transactionError, transactionStatus]);

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
        if (nextState === "FAILED" || nextState === "EXPIRED") {
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

  if (!merchantReferenceId && !redirectUrl) {
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
        <View style={styles.browserCard}>
          <Text style={styles.sectionTitle}>PhonePe Checkout</Text>
          <Text style={styles.helperText}>
            {redirectUrl
              ? "The payment page has been opened in your browser. Complete the payment there, then return here."
              : "This order was started through the PhonePe SDK. Use the status check below while the backend confirms the payment."}
          </Text>
          {redirectUrl ? (
            <TouchableOpacity
              style={[styles.openButton, openingBrowser && styles.disabledButton]}
              onPress={() => void openPaymentBrowser()}
              disabled={openingBrowser}
            >
              {openingBrowser ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.openButtonText}>
                  {browserOpened ? "Reopen Payment Page" : "Open Payment Page"}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
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
  browserCard: {
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
  openButton: {
    marginTop: 16, backgroundColor: "#0f172a", borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  openButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  footer: { padding: 16, backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  checkButton: { backgroundColor: "#0f172a", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  checkButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  button: { marginTop: 16, backgroundColor: "#0f172a", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: "#ffffff", fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  disabledButton: { opacity: 0.7 },
});
