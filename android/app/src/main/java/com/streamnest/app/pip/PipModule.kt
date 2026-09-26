package com.streamnest.app.pip

import android.app.PictureInPictureParams
import android.graphics.Rect
import android.os.Build
import android.util.Rational
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class PipModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PipModule"

    @ReactMethod
    fun enterPip(promise: Promise) {
        val activity = currentActivity as? com.streamnest.app.MainActivity
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
                    val rect = com.streamnest.app.MainActivity.currentSourceRect
                    if (rect != null && !rect.isEmpty) {
                        builder.setSourceRectHint(rect)
                    }
                    val actions = com.streamnest.app.MainActivity.createPipActions(activity, com.streamnest.app.MainActivity.isVideoPlaying)
                    if (actions.isNotEmpty()) {
                        builder.setActions(actions)
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
            com.streamnest.app.MainActivity.updatePipState(activity, isPlaying, autoPipEnabled, null)
        } ?: run {
            com.streamnest.app.MainActivity.isVideoPlaying = isPlaying
            com.streamnest.app.MainActivity.isAutoPipEnabled = autoPipEnabled
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun setVideoPlaybackStateWithRect(isPlaying: Boolean, autoPipEnabled: Boolean, rectMap: ReadableMap?, promise: Promise) {
        val activity = currentActivity as? com.streamnest.app.MainActivity
        var sourceRect: Rect? = null
        if (rectMap != null && rectMap.hasKey("width") && rectMap.hasKey("height")) {
            try {
                val density = activity?.resources?.displayMetrics?.density ?: 1f
                val x = (rectMap.getDouble("x") * density).toInt()
                val y = (rectMap.getDouble("y") * density).toInt()
                val w = (rectMap.getDouble("width") * density).toInt()
                val h = (rectMap.getDouble("height") * density).toInt()
                if (w > 0 && h > 0) {
                    sourceRect = Rect(x, y, x + w, y + h)
                }
            } catch (e: Exception) {
                // Ignore
            }
        }
        activity?.runOnUiThread {
            com.streamnest.app.MainActivity.updatePipState(activity, isPlaying, autoPipEnabled, sourceRect)
        } ?: run {
            com.streamnest.app.MainActivity.isVideoPlaying = isPlaying
            com.streamnest.app.MainActivity.isAutoPipEnabled = autoPipEnabled
            com.streamnest.app.MainActivity.currentSourceRect = sourceRect
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
