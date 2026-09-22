package com.streamnest.app.pip

import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class PipModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PipModule"

    @ReactMethod
    fun enterPip(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            activity.runOnUiThread {
                try {
                    val aspectRatio = Rational(16, 9)
                    val builder = PictureInPictureParams.Builder()
                        .setAspectRatio(aspectRatio)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        builder.setAutoEnterEnabled(true)
                    }
                    val entered = activity.enterPictureInPictureMode(builder.build())
                    promise.resolve(entered)
                } catch (e: Exception) {
                    promise.reject("PIP_ERROR", e.message)
                }
            }
        } else {
            promise.reject("UNSUPPORTED", "Android O (API 26) or higher is required for Picture-in-Picture")
        }
    }

    @ReactMethod
    fun setVideoPlaybackState(isPlaying: Boolean, autoPipEnabled: Boolean, promise: Promise) {
        val activity = currentActivity as? com.streamnest.app.MainActivity
        activity?.runOnUiThread {
            com.streamnest.app.MainActivity.updatePipState(activity, isPlaying, autoPipEnabled)
        } ?: run {
            com.streamnest.app.MainActivity.isVideoPlaying = isPlaying
            com.streamnest.app.MainActivity.isAutoPipEnabled = autoPipEnabled
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun isPipSupported(promise: Promise) {
        val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                reactContext.packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_PICTURE_IN_PICTURE)
        promise.resolve(supported)
    }
}
