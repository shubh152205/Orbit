package com.streamnest.app.adblock

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class BraveShieldsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    @ReactMethod
    fun setShieldsEnabled(enabled: Boolean, promise: Promise) {
        BraveNativeEngine.setShieldsEnabled(enabled)
        promise.resolve(BraveNativeEngine.isShieldsEnabled())
    }

    @ReactMethod
    fun isShieldsEnabled(promise: Promise) {
        promise.resolve(BraveNativeEngine.isShieldsEnabled())
    }

    @ReactMethod
    fun getBlockedCount(promise: Promise) {
        promise.resolve(BraveNativeEngine.getBlockedCount())
    }

    @ReactMethod
    fun resetBlockedCount(promise: Promise) {
        BraveNativeEngine.resetBlockedCount()
        promise.resolve(0)
    }

    @ReactMethod
    fun getRulesCount(promise: Promise) {
        promise.resolve(BraveNativeEngine.getRulesCount())
    }

    @ReactMethod
    fun addCustomRule(rule: String, promise: Promise) {
        BraveNativeEngine.addRule(rule)
        BraveNativeEngine.compileRules()
        promise.resolve(true)
    }

    @ReactMethod
    fun testUrl(url: String, host: String, firstPartyHost: String, promise: Promise) {
        val isThirdParty = host.isNotEmpty() && firstPartyHost.isNotEmpty() && !host.equals(firstPartyHost, ignoreCase = true)
        val blocked = BraveNativeEngine.shouldBlockUrl(url, host, firstPartyHost, "script", isThirdParty)
        promise.resolve(blocked)
    }

    companion object {
        const val NAME = "BraveShieldsModule"
        const val EVENT_AD_BLOCKED = "onNativeAdBlocked"

        fun sendAdBlockedEvent(
            reactContext: ReactContext,
            url: String,
            host: String,
            resourceType: String,
            totalBlocked: Int
        ) {
            try {
                val params = Arguments.createMap().apply {
                    putString("url", url)
                    putString("host", host)
                    putString("resourceType", resourceType)
                    putInt("totalBlocked", totalBlocked)
                }
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(EVENT_AD_BLOCKED, params)
            } catch (e: Exception) {
                // Ignore if JS engine is temporarily detached
            }
        }
    }
}
