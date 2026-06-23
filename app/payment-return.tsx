import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * This route handles the deep link callback from payment gateways
 * Expected formats:
 * - therapyapp://payment-return?transactionStatus=SUCCESS&merchantReferenceId=xxx
 * - therapy://payment-return?transactionStatus=SUCCESS&merchantReferenceId=xxx
 */
export default function PaymentReturnScreen() {
  const params = useLocalSearchParams();
  
  useEffect(() => {
    // Extract all params from the deep link
    const transactionStatus = (params.transactionStatus as string) || (params.status as string);
    const merchantReferenceId = (params.merchantReferenceId as string) || (params.reference_id as string) || (params.referenceId as string);
    const transactionError = (params.transactionError as string) || (params.error as string);
    
    // Give it a small delay to ensure navigation stack is ready
    const timer = setTimeout(() => {
      if (merchantReferenceId) {
        router.replace({
          pathname: "/payment",
          params: {
            transactionStatus,
            merchantReferenceId,
            transactionError,
          },
        });
      } else {
        router.replace("/payment");
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}
