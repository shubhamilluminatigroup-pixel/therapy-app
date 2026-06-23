# PhonePe Native SDK Integration Guide

## Changes Made

Your app has been migrated from **browser-based PhonePe checkout** to **native PhonePe SDK integration** using `react-native-phonepe-pg`.

### Files Updated:
1. **app/payment.tsx** - Refactored to use the PhonePe SDK
2. **components/CartCheckoutModal.tsx** - Simplified to pass payment parameters directly to payment screen
3. **Package.json** - Added `react-native-phonepe-pg` dependency

### Key Changes:

#### Before (Browser Flow):
```
Cart → redirectUrl received → Browser opens → User pays → Deep link callback → App verifies
```

#### After (Native SDK Flow):
```
Cart → Payment screen → PhonePe SDK opens → User pays → SDK callback → App verifies
```

## Required Configuration

### 1. Update Merchant ID
Edit [app/payment.tsx](app/payment.tsx) and replace the placeholder:

```typescript
const paymentPayload = {
  merchantId: "YOUR_MERCHANT_ID", // ← Replace with your actual merchant ID
  // ... rest of payload
};
```

Get your Merchant ID from:
- PhonePe Dashboard → Merchant Settings → Merchant ID

### 2. Rebuild Native Modules
Since `react-native-phonepe-pg` includes native code, you need to rebuild the app:

```bash
# Clear cache and rebuild
npx expo prebuild --clean
npm run android     # For Android
npm run ios        # For iOS
```

### 3. Update Deep Link Configuration
The SDK returns payments via deep link: `therapyapp://payment-return`

Ensure your app.json has the correct scheme configured:
```json
{
  "plugins": [
    [
      "expo-router",
      {
        "origin": "therapyapp://",
        "schemes": ["therapyapp", "therapy"]
      }
    ]
  ]
}
```

### 4. Payment Flow

When a user initiates checkout:
1. Backend returns a `merchant_reference_id`
2. Payment screen automatically calls `PhonePePayment.startTransaction()`
3. PhonePe SDK opens natively (not in browser)
4. After payment, SDK invokes the callback
5. App polls backend every 4 seconds to confirm payment status
6. On success, user is taken to My Course page

### 5. Testing

Before going live:
- Test with PhonePe's test merchant ID first
- Verify deep link callbacks work on both Android and iOS
- Test payment success, failure, and cancellation scenarios

## API Changes

No backend API changes needed. The backend still:
- Returns `merchant_reference_id` from `/initiate-payment`
- Returns `payment_state` from `/check-payment-status`
- Confirms payment with `/confirm-payment`

## Troubleshooting

### Issue: PhonePe module not found
```
Solution: Run `npx expo prebuild --clean` to rebuild native modules
```

### Issue: Deep link not working
```
Solution: Verify app.json scheme matches your PhonePe dashboard redirect URL
```

### Issue: Payment state stuck as PENDING
```
Solution: 
- Verify merchant ID is correct
- Check backend is receiving payment events from PhonePe
- Inspect app logs for SDK errors
```

## Reverting to Browser Flow

If you need to revert to browser-based checkout:
1. Restore the old `app/payment.tsx` (has browser-based flow)
2. Restore old `CartCheckoutModal.tsx` (includes `redirectUrl` handling)
3. Uninstall: `npm uninstall react-native-phonepe-pg`

