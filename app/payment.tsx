import { confirmAppPayment, getAppPaymentStatus } from "@/lib/api";
import { startPhonePePayment } from "@/lib/phonepe";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentScreen() {
  const {
    merchantReferenceId,
    amount,
    courseName,
    orderId,
    token,
    paymentMode,
    merchantId,
    phonePeEnvironment,
    targetAppPackageName,
  } = useLocalSearchParams<{
    merchantReferenceId?: string;
    amount?: string;
    courseName?: string;
    orderId?: string;
    token?: string;
    paymentMode?: string;
    merchantId?: string;
    phonePeEnvironment?: string;
    targetAppPackageName?: string;
  }>();

  const [paymentState, setPaymentState] = useState("PENDING");
  const [paymentMessage, setPaymentMessage] = useState(
    "Waiting for the payment confirmation..."
  );
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const statusTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const paymentConfirmed = useRef(false);
  const resolvedMerchantId =
    merchantId || process.env.EXPO_PUBLIC_PHONEPE_MERCHANT_ID || "";
  const resolvedEnvironment =
    phonePeEnvironment || process.env.EXPO_PUBLIC_PHONEPE_ENVIRONMENT || "PRODUCTION";

  const completePayment = useCallback(async (sdkStatus?: string) => {
    if (!merchantReferenceId || paymentConfirmed.current) return;

    paymentConfirmed.current = true;

    try {
      await confirmAppPayment(merchantReferenceId, {
        paymentState: "COMPLETED",
        sdkStatus,
      });
    } catch (error) {
      paymentConfirmed.current = false;
      throw error;
    }

    setPaymentState("COMPLETED");
    setPaymentMessage("Payment completed successfully.");

    Alert.alert(
      "Payment successful",
      "Your course has been added successfully.",
      [
        {
          text: "Open My Course",
          onPress: () => router.replace("/(tabs)/my-course"),
        },
      ]
    );
  }, [merchantReferenceId]);

  const refreshPaymentState = useCallback(async () => {
    if (!merchantReferenceId) return "PENDING";

    const data = await getAppPaymentStatus(merchantReferenceId);

    const nextState = data.payment_state || "PENDING";

    setPaymentState(nextState);

    setPaymentMessage(
      nextState === "COMPLETED"
        ? "Payment completed successfully."
        : nextState === "FAILED" ||
          nextState === "EXPIRED" ||
          nextState === "CANCELLED"
        ? `Payment ${nextState.toLowerCase()}. You can try again.`
        : "Your payment is being processed..."
    );

    if (
      nextState === "FAILED" ||
      nextState === "CANCELLED" ||
      nextState === "EXPIRED"
    ) {
      setProcessingPayment(false);
    }

    return nextState;
  }, [merchantReferenceId]);

  const initiatePhonePePayment = async () => {
    if (!orderId || !token) {
      Alert.alert("Payment Error", "Order information missing.");
      return;
    }

    try {
      setProcessingPayment(true);
      setPaymentMessage("Opening PhonePe checkout...");

      const flowId = String(merchantReferenceId || orderId || Date.now()).replace(
        /[^a-zA-Z0-9]/g,
        ""
      );

      const response = await startPhonePePayment({
        orderId: String(orderId),
        token: String(token),
        merchantId: String(resolvedMerchantId),
        environment: String(resolvedEnvironment),
        flowId,
        paymentMode,
        targetAppPackageName,
        appSchema: "therapyapp",
      });

      console.log("PhonePe Response:", response);

      if (response?.status && response.status !== "SUCCESS") {
        throw new Error(response.error || `PhonePe returned ${response.status}`);
      }

      if (response?.status === "SUCCESS") {
        await completePayment(response.status);
        return;
      }

      setPaymentMessage(
        "Payment flow completed. Verifying payment status..."
      );

      await refreshPaymentState();
    } catch (error) {
      console.log("PhonePe Error:", error);

      Alert.alert(
        "Payment Failed",
        error instanceof Error ? error.message : "Unable to start payment"
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  useEffect(() => {
    if (!merchantReferenceId) return;

    void refreshPaymentState();

    statusTimer.current = setInterval(async () => {
      try {
        const nextState = await refreshPaymentState();

        if (nextState === "COMPLETED") {
          if (statusTimer.current) {
            clearInterval(statusTimer.current);
            statusTimer.current = null;
          }

          await completePayment();
        }

        if (
          nextState === "FAILED" ||
          nextState === "EXPIRED" ||
          nextState === "CANCELLED"
        ) {
          if (statusTimer.current) {
            clearInterval(statusTimer.current);
            statusTimer.current = null;
          }
        }
      } catch (error) {
        console.log("Polling Error:", error);
      }
    }, 4000);

    return () => {
      if (statusTimer.current) {
        clearInterval(statusTimer.current);
        statusTimer.current = null;
      }
    };
  }, [merchantReferenceId, completePayment, refreshPaymentState]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          void refreshPaymentState();
        }
      }
    );

    return () => subscription.remove();
  }, [refreshPaymentState]);

  const handleCheckStatus = async () => {
    try {
      setCheckingPayment(true);

      const nextState = await refreshPaymentState();

      if (nextState === "COMPLETED") {
        await completePayment();
        return;
      }

      Alert.alert(
        "Payment Status",
        `Current payment state: ${nextState}`
      );
    } catch (error) {
      Alert.alert(
        "Status Error",
        error instanceof Error
          ? error.message
          : "Unable to check payment status."
      );
    } finally {
      setCheckingPayment(false);
    }
  };

  if (
    !merchantReferenceId ||
    !amount ||
    !orderId ||
    !token
  ) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Payment page unavailable</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.backButtonText}>{"<- Back"}</Text>
        </TouchableOpacity>

        <View style={styles.headerMeta}>
          <Text style={styles.headerTitle}>Payment</Text>
          <Text style={styles.headerState}>{paymentState}</Text>
        </View>
      </View>

      <View style={styles.summaryBar}>
        <Text style={styles.amountText}>Rs {amount}</Text>

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
              : paymentState === "FAILED" ||
                paymentState === "CANCELLED" ||
                paymentState === "EXPIRED"
              ? "Payment was not completed. Please try again."
              : `Click below to pay Rs ${amount} via PhonePe`}
          </Text>

          {paymentState !== "COMPLETED" && (
            <TouchableOpacity
              style={[
                styles.paymentButton,
                processingPayment && styles.disabledButton,
              ]}
              onPress={() => void initiatePhonePePayment()}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.paymentButtonText}>
                    Opening PhonePe...
                  </Text>
                </>
              ) : (
                <Text style={styles.paymentButtonText}>
                  Pay Rs {amount}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Payment Status</Text>

          <Text style={styles.statusValue}>{paymentState}</Text>

          <Text style={styles.referenceText}>
            Reference: {merchantReferenceId}
          </Text>

          <Text style={styles.helperText}>{paymentMessage}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.checkButton,
            checkingPayment && styles.disabledButton,
          ]}
          onPress={() => void handleCheckStatus()}
          disabled={checkingPayment}
        >
          {checkingPayment ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkButtonText}>
              Check Status
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: { paddingVertical: 6, paddingHorizontal: 4 },
  backButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2563eb",
  },
  headerMeta: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerState: {
    marginTop: 2,
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "700",
  },
  summaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#eef2ff",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "800",
  },
  courseText: {
    marginTop: 2,
    fontSize: 13,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  sdkCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  statusValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  referenceText: {
    marginTop: 10,
    fontSize: 12,
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
  },
  paymentButton: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  paymentButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
  },
  checkButton: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  checkButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  button: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.7,
  },
});
