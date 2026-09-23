package com.streamnest.app.media

import android.content.Context
import android.media.AudioManager
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.streamnest.app.adblock.BraveWebView

class BraveMediaModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "BraveMediaModule"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun startBackgroundPlayback(title: String?, subtitle: String?, promise: Promise) {
        try {
            BraveMediaPlaybackService.start(reactContext, title, subtitle)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_SERVICE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopBackgroundPlayback(promise: Promise) {
        try {
            BraveMediaPlaybackService.stop(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SERVICE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun isBackgroundPlaybackActive(promise: Promise) {
        promise.resolve(BraveMediaPlaybackService.isServiceRunning)
    }

    @ReactMethod
    fun setBackgroundPlayEnabled(enabled: Boolean, promise: Promise) {
        BraveWebView.isBackgroundPlayEnabled = enabled
        promise.resolve(true)
    }

    @ReactMethod
    fun updatePlaybackState(isPlaying: Boolean, title: String?, subtitle: String?, promise: Promise) {
        try {
            BraveMediaPlaybackService.updateState(reactContext, isPlaying, title, subtitle)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }
}
