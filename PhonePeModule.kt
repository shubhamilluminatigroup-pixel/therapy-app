package com.mrcayurveda.therappy

import android.app.Activity
import android.content.Intent

import com.facebook.react.bridge.*

import com.phonepe.intent.sdk.api.PhonePeKt
import com.phonepe.intent.sdk.api.models.PhonePeEnvironment

class PhonePeModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "PhonePeModule"
    }

    @ReactMethod
    fun initialize(
        merchantId: String,
        environment: String,
        flowId: String,
        promise: Promise
    ) {
        try {
            val phonePeEnvironment = when (environment.uppercase()) {
                "SANDBOX" -> PhonePeEnvironment.SANDBOX
                else -> PhonePeEnvironment.RELEASE
            }

            val result = PhonePeKt.init(
                reactApplicationContext,
                merchantId,
                flowId,
                phonePeEnvironment,
                false
            )

            promise.resolve(result)

        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e)
        }
    }

    @ReactMethod
    fun startCheckout(
        orderId: String,
        token: String,
        promise: Promise
    ) {

        val activity: Activity? = reactApplicationContext.currentActivity

        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Activity missing")
            return
        }

        try {

            PhonePeKt.startCheckoutPage(
                activity,
                token,
                orderId,
                1001
            )

            promise.resolve(true)

        } catch (e: Exception) {
            promise.reject("PAYMENT_ERROR", e)
        }
    }
}
