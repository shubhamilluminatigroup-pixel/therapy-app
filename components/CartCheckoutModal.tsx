import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  applyCouponCode,
  getServicePrice,
  initiateAppPayment,
  listServiceMonths,
} from "../lib/api";
import { Course } from "../types/backend";

type ServiceMonthOption = {
  id: string;
  month: number;
  price: number;
};

type CartCheckoutModalProps = {
  visible: boolean;
  course: Course;
  onClose: () => void;
  onPaymentFailure: () => void;
};

export default function CartCheckoutModal({
  visible,
  course,
  onClose,
  onPaymentFailure,
}: CartCheckoutModalProps) {
  const router = useRouter();
  const [months, setMonths] = useState<ServiceMonthOption[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [basePrice, setBasePrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const [pricingLoading, setPricingLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [startingPayment, setStartingPayment] = useState(false);
  const totalPrice = useMemo(
    () => Math.max(0, basePrice - (basePrice * discountPercent) / 100),
    [basePrice, discountPercent]
  );

  useEffect(() => {
    if (visible) {
      void loadPricingMonths();
      return;
    }

    setMonths([]);
    setSelectedMonthId("");
    setSelectedMonth(null);
    setBasePrice(0);
    setDiscountPercent(0);
    setCouponCode("");
    setAppliedCouponCode("");
    setPricingLoading(false);
    setCouponLoading(false);
    setStartingPayment(false);
  }, [visible, course.id]);

  const loadPricingMonths = async () => {
    try {
      setPricingLoading(true);
      const items = await listServiceMonths(course.id);
      setMonths(items);

      if (items.length > 0) {
        const first = items[0];
        setSelectedMonthId(first.id);
        await handleSelectMonth(first.id);
      }
    } catch (error) {
      console.log("Load pricing months error:", error);
      Alert.alert("Pricing error", "Unable to load course pricing.");
    } finally {
      setPricingLoading(false);
    }
  };

  const handleSelectMonth = async (monthId: string) => {
    try {
      setSelectedMonthId(monthId);
      setCouponCode("");
      setAppliedCouponCode("");
      setDiscountPercent(0);
      const data = await getServicePrice({
        courseId: course.id,
        monthId,
      });
      setSelectedMonth(data.month);
      setBasePrice(data.price);
    } catch (error) {
      console.log("Get service price error:", error);
      Alert.alert("Pricing error", "Unable to load pricing for the selected duration.");
    }
  };

  const handleApplyCoupon = async () => {
    if (!selectedMonthId) {
      Alert.alert("Select duration", "Please choose a duration first.");
      return;
    }

    if (!couponCode.trim()) {
      setDiscountPercent(0);
      setAppliedCouponCode("");
      return;
    }

    try {
      setCouponLoading(true);
      const data = await applyCouponCode({
        courseId: course.id,
        couponCode: couponCode.trim(),
      });
      setDiscountPercent(data.percent);
      setAppliedCouponCode(data.couponCode);

      if (!data.percent) {
        Alert.alert("Invalid coupon", "No discount was found for this code.");
      }
    } catch (error) {
      console.log("Apply coupon error:", error);
      Alert.alert("Coupon error", "Unable to apply coupon right now.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleProceed = async () => {
    if (!selectedMonthId || !selectedMonth) {
      Alert.alert("Select duration", "Please choose a duration before checkout.");
      return;
    }

    try {
      setStartingPayment(true);

      const data = await initiateAppPayment({
        courseId: course.id,
        month: selectedMonth,
        couponCode: appliedCouponCode || couponCode.trim(),
      });

      const referenceId = data.merchant_reference_id || "";
      const nextRedirectUrl = data.redirectUrl || "";

      if (!nextRedirectUrl) {
        Alert.alert(
          "Payment started",
          "The payment request was created, but the gateway page was not returned."
        );
        onPaymentFailure();
        return;
      }

      if (
        nextRedirectUrl.includes("api.phonepe.com/apis/pg/checkout/ui/") &&
        !nextRedirectUrl.includes("token=")
      ) {
        Alert.alert(
          "Payment error",
          "PhonePe returned an invalid checkout link (missing token). Please try again after some time."
        );
        onPaymentFailure();
        return;
      }

      const canOpen = await Linking.canOpenURL(nextRedirectUrl);
      if (!canOpen) {
        throw new Error("Unable to open website checkout");
      }

      await Linking.openURL(nextRedirectUrl);
      onClose();
      router.push({
        pathname: "/payment",
        params: {
          redirectUrl: nextRedirectUrl,
          merchantReferenceId: referenceId,
          amount: String(data.amount ?? totalPrice.toFixed(2)),
          courseName: course.courseName || "Course Payment",
          browserOpened: "1",
        },
      });
    } catch (error) {
      console.log("Start payment error:", error);
      Alert.alert("Payment error", error instanceof Error ? error.message : "Unable to start payment.");
      onPaymentFailure();
    } finally {
      setStartingPayment(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Cart Page</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.cartItemRow}>
              {course.imageUrl ? (
                <Image source={{ uri: course.imageUrl }} style={styles.cartThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.cartThumb, styles.cartThumbPlaceholder]}>
                  <Text style={styles.cartThumbText}>IMG</Text>
                </View>
              )}

              <View style={styles.cartInfo}>
                <Text style={styles.cartType}>Therapy</Text>
                <Text style={styles.cartName}>{course.courseName || "Untitled Course"}</Text>
                <Text style={styles.cartPrice}>Price Rs {basePrice.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items</Text>
                <Text style={styles.summaryValue}>1</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={styles.summaryValue}>Rs {basePrice.toFixed(2)}</Text>
              </View>

              <Text style={styles.fieldLabel}>Duration</Text>
              <View style={styles.pickerWrap}>
                {pricingLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#2563eb" />
                  </View>
                ) : (
                  <Picker
                    selectedValue={selectedMonthId}
                    onValueChange={(value) => {
                      if (value) {
                        void handleSelectMonth(String(value));
                      }
                    }}
                  >
                    <Picker.Item label="Select Month" value="" />
                    {months.map((item) => (
                      <Picker.Item key={item.id} label={`${item.month} Month`} value={item.id} />
                    ))}
                  </Picker>
                )}
              </View>

              <Text style={styles.fieldLabel}>Give Code</Text>
              <View style={styles.couponRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter your code"
                  placeholderTextColor="#94a3b8"
                  value={couponCode}
                  onChangeText={setCouponCode}
                  autoCapitalize="characters"
                />
                <Pressable
                  style={[styles.applyButton, couponLoading && styles.disabledButton]}
                  onPress={() => void handleApplyCoupon()}
                  disabled={couponLoading}
                >
                  <Text style={styles.applyButtonText}>{couponLoading ? "..." : "Apply"}</Text>
                </Pressable>
              </View>

              {!!appliedCouponCode && (
                <Text style={styles.couponApplied}>Applied: {appliedCouponCode}</Text>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={styles.summaryValue}>{discountPercent}%</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Price</Text>
                <Text style={styles.totalValue}>Rs {totalPrice.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.checkoutButton, startingPayment && styles.disabledButton]}
              onPress={() => void handleProceed()}
              disabled={startingPayment}
            >
              {startingPayment ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.checkoutButtonText}>Complete Checkout</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.34)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e7edf5",
    zIndex: 1,
    maxHeight: "88%",
    minHeight: "60%",
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  cartItemRow: {
    flexDirection: "row",
    gap: 14,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  cartThumb: {
    width: 92,
    height: 92,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
  },
  cartThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cartThumbText: {
    color: "#64748b",
    fontWeight: "800",
  },
  cartInfo: {
    flex: 1,
    justifyContent: "center",
  },
  cartType: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  cartName: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  cartPrice: {
    marginTop: 8,
    fontSize: 14,
    color: "#1d4ed8",
    fontWeight: "700",
  },
  summaryCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "700",
  },
  summaryValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "800",
  },
  fieldLabel: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    color: "#334155",
    fontWeight: "700",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    marginBottom: 12,
  },
  loadingRow: {
    paddingVertical: 18,
    alignItems: "center",
  },
  couponRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  couponInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    color: "#0f172a",
    fontSize: 14,
  },
  applyButton: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  couponApplied: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 13,
    color: "#15803d",
    fontWeight: "700",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#dbe2ea",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "800",
  },
  totalValue: {
    fontSize: 18,
    color: "#0f172a",
    fontWeight: "800",
  },
  checkoutButton: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.7,
  },
});
