package com.streamnest.app

import android.app.PendingIntent
import android.app.PictureInPictureParams
import android.app.RemoteAction
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.graphics.Rect
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.util.Rational

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.streamnest.app.adblock.BraveWebView
import com.streamnest.app.media.BraveMediaPlaybackService

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

  companion object {
    const val ACTION_PIP_PLAY_PAUSE = "com.streamnest.app.ACTION_PIP_PLAY_PAUSE"

    @Volatile
    var isVideoPlaying: Boolean = false

    @Volatile
    var isAutoPipEnabled: Boolean = false

    @Volatile
    var currentSourceRect: Rect? = null

    fun createPipActions(context: Context, isPlaying: Boolean): List<RemoteAction> {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return emptyList()
      try {
        val iconRes = if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        val title = if (isPlaying) "Pause" else "Play"
        val intent = Intent(ACTION_PIP_PLAY_PAUSE).setPackage(context.packageName)
        val pendingIntent = PendingIntent.getBroadcast(
          context,
          101,
          intent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val icon = Icon.createWithResource(context, iconRes)
        val action = RemoteAction(icon, title, title, pendingIntent)
        return listOf(action)
      } catch (e: Exception) {
        return emptyList()
      }
    }

    fun updatePipState(
      activity: MainActivity?,
      isPlaying: Boolean,
      autoPipEnabled: Boolean,
      sourceRect: Rect? = null
    ) {
      isVideoPlaying = isPlaying
      isAutoPipEnabled = autoPipEnabled
      if (sourceRect != null && !sourceRect.isEmpty) {
        currentSourceRect = sourceRect
      } else if (!isPlaying) {
        currentSourceRect = null
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && activity != null) {
        try {
          val aspectRatio = Rational(16, 9)
          val builder = PictureInPictureParams.Builder()
            .setAspectRatio(aspectRatio)
            .setAutoEnterEnabled(isPlaying && autoPipEnabled)

          val rect = currentSourceRect
          if (rect != null && !rect.isEmpty) {
            builder.setSourceRectHint(rect)
          }

          val actions = createPipActions(activity, isPlaying)
          if (actions.isNotEmpty()) {
            builder.setActions(actions)
          }

          activity.setPictureInPictureParams(builder.build())
        } catch (e: Exception) {
          // Ignore
        }
      }
    }
  }

  private val pipActionReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent?.action == ACTION_PIP_PLAY_PAUSE) {
        val willPlay = !isVideoPlaying
        updatePipState(this@MainActivity, willPlay, isAutoPipEnabled, currentSourceRect)

        if (willPlay) {
          BraveMediaPlaybackService.updateState(this@MainActivity, true)
        } else {
          BraveMediaPlaybackService.updateState(this@MainActivity, false)
        }

        BraveWebView.activeWebView?.get()?.let { wv ->
          wv.post {
            val script = if (willPlay) {
              "(function(){ var yt=document.getElementById('movie_player')||document.getElementById('player')||document.querySelector('.html5-video-player'); if(yt&&typeof yt.playVideo==='function'){yt.playVideo();} var v=document.querySelector('video'); if(v&&v.paused) v.play().catch(function(){}); var btn=document.querySelector('button.player-control-play-pause-icon, .ytp-play-button, button[aria-label=\"Play video\"]'); if(btn) btn.click(); var overlay=document.querySelector('.player-controls-middle, .ytp-bezel'); if(overlay){ overlay.style.display='none'; setTimeout(function(){ overlay.style.display=''; }, 250); } })();"
            } else {
              "(function(){ var yt=document.getElementById('movie_player')||document.getElementById('player')||document.querySelector('.html5-video-player'); if(yt&&typeof yt.pauseVideo==='function'){yt.pauseVideo();} var v=document.querySelector('video'); if(v&&!v.paused) v.pause(); var btn=document.querySelector('button.player-control-play-pause-icon, .ytp-play-button, button[aria-label=\"Pause video\"]'); if(btn) btn.click(); })();"
            }
            wv.evaluateJavascript(script, null)
          }
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
    updatePipState(this, false, false, null)

    try {
      val filter = IntentFilter(ACTION_PIP_PLAY_PAUSE)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(pipActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        registerReceiver(pipActionReceiver, filter)
      }
    } catch (e: Exception) {
      // Ignore
    }
  }

  override fun onDestroy() {
    try {
      unregisterReceiver(pipActionReceiver)
    } catch (e: Exception) {
      // Ignore
    }
    super.onDestroy()
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
        val rect = currentSourceRect
        if (rect != null && !rect.isEmpty) {
          builder.setSourceRectHint(rect)
        }
        val actions = createPipActions(this, isVideoPlaying)
        if (actions.isNotEmpty()) {
          builder.setActions(actions)
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
