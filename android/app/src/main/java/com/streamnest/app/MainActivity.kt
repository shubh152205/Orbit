package com.streamnest.app

import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

  companion object {
    @Volatile
    var isVideoPlaying: Boolean = false

    @Volatile
    var isAutoPipEnabled: Boolean = false

    fun updatePipState(activity: MainActivity?, isPlaying: Boolean, autoPipEnabled: Boolean) {
      isVideoPlaying = isPlaying
      isAutoPipEnabled = autoPipEnabled
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && activity != null) {
        try {
          val aspectRatio = Rational(16, 9)
          val builder = PictureInPictureParams.Builder()
            .setAspectRatio(aspectRatio)
            .setAutoEnterEnabled(isPlaying && autoPipEnabled)
          activity.setPictureInPictureParams(builder.build())
        } catch (e: Exception) {
          // Ignore
        }
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme)
    super.onCreate(null)
    // Strictly disable auto-enter PiP on launch: only enabled when video actively plays
    updatePipState(this, false, false)
  }

  /**
   * System-level Picture-in-Picture trigger:
   * Called when user presses Home, swipes up to Home, or switches apps.
   * STRICT CHECK: Only enter PiP if a video is actively playing!
   */
  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    if (!isVideoPlaying || !isAutoPipEnabled) {
      return
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      try {
        val aspectRatio = Rational(16, 9)
        val builder = PictureInPictureParams.Builder()
          .setAspectRatio(aspectRatio)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          builder.setAutoEnterEnabled(true)
        }
        enterPictureInPictureMode(builder.build())
      } catch (e: Exception) {
        // Fallback gracefully on devices where PiP is disabled by user or OEM
      }
    }
  }

  override fun onPictureInPictureModeChanged(
    isInPictureInPictureMode: Boolean,
    newConfig: Configuration
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    try {
      val reactContext = reactInstanceManager?.currentReactContext
      if (reactContext != null) {
        val params = com.facebook.react.bridge.Arguments.createMap().apply {
          putBoolean("isInPictureInPictureMode", isInPictureInPictureMode)
        }
        reactContext
          .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("onPictureInPictureModeChanged", params)
      }
    } catch (e: Exception) {
      // Ignore
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
