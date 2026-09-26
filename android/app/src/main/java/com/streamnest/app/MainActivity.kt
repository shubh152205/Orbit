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
    const val ACTION_PIP_AUDIO = "com.streamnest.app.ACTION_PIP_AUDIO"
    const val ACTION_PIP_PLAY_PAUSE = "com.streamnest.app.ACTION_PIP_PLAY_PAUSE"
    const val ACTION_PIP_NEXT = "com.streamnest.app.ACTION_PIP_NEXT"

    @Volatile
    var isVideoPlaying: Boolean = false

    @Volatile
    var isAutoPipEnabled: Boolean = false

    @Volatile
    var currentSourceRect: Rect? = null

    fun createPipActions(context: Context, isPlaying: Boolean): List<RemoteAction> {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return emptyList()
      try {
        val actions = mutableListOf<RemoteAction>()

        // 1. Headphones / Background Audio Action (Matches YouTube PiP Audio Mode)
        val audioIntent = Intent(ACTION_PIP_AUDIO).setPackage(context.packageName)
        val audioPendingIntent = PendingIntent.getBroadcast(
          context,
          100,
          audioIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        actions.add(RemoteAction(
          Icon.createWithResource(context, R.drawable.ic_pip_audio),
          "Background Audio",
          "Background Audio",
          audioPendingIntent
        ))

        // 2. Play / Pause Action
        val iconRes = if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        val title = if (isPlaying) "Pause" else "Play"
        val intent = Intent(ACTION_PIP_PLAY_PAUSE).setPackage(context.packageName)
        val pendingIntent = PendingIntent.getBroadcast(
          context,
          101,
          intent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        actions.add(RemoteAction(Icon.createWithResource(context, iconRes), title, title, pendingIntent))

        // 3. Next Video Action
        val nextIntent = Intent(ACTION_PIP_NEXT).setPackage(context.packageName)
        val nextPendingIntent = PendingIntent.getBroadcast(
          context,
          102,
          nextIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        actions.add(RemoteAction(
          Icon.createWithResource(context, android.R.drawable.ic_media_next),
          "Next",
          "Next",
          nextPendingIntent
        ))

        return actions
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
      if (intent?.action == ACTION_PIP_AUDIO) {
        // 1. Ensure background audio notification service is running
        BraveMediaPlaybackService.updateState(this@MainActivity, true)

        // 2. Keep WebView playback running in background
        BraveWebView.activeWebView?.get()?.let { wv ->
          wv.post {
            wv.resumeTimers()
            val script = "(function(){ window.__orbit_user_paused = false; var yt=document.getElementById('movie_player')||document.getElementById('player')||document.querySelector('.html5-video-player'); if(yt&&typeof yt.playVideo==='function'){yt.playVideo();} var v=document.querySelector('video'); if(v&&v.paused){v.play().catch(function(){});} })();"
            wv.evaluateJavascript(script, null)
          }
        }

        // 3. Emit event to React Native bridge
        try {
          val reactApp = application as? com.facebook.react.ReactApplication
          val reactContext = reactApp?.reactNativeHost?.reactInstanceManager?.currentReactContext
          reactContext
            ?.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("onPipAudioModeTriggered", null)
        } catch (e: Exception) {
          // Ignore
        }

        // 4. Move activity to back to dismiss floating PiP window while keeping audio streaming in background
        moveTaskToBack(true)
      } else if (intent?.action == ACTION_PIP_PLAY_PAUSE) {
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
              "window.__orbit_user_paused = false; (function(){ var yt=document.getElementById('movie_player')||document.getElementById('player')||document.querySelector('.html5-video-player'); if(yt&&typeof yt.playVideo==='function'){yt.playVideo();} var v=document.querySelector('video'); if(v&&v.paused) v.play().catch(function(){}); var btn=document.querySelector('button.player-control-play-pause-icon, .ytp-play-button, button[aria-label=\"Play video\"]'); if(btn) btn.click(); var overlay=document.querySelector('.player-controls-middle, .ytp-bezel'); if(overlay){ overlay.style.display='none'; setTimeout(function(){ overlay.style.display=''; }, 250); } })();"
            } else {
              "window.__orbit_user_paused = true; (function(){ var yt=document.getElementById('movie_player')||document.getElementById('player')||document.querySelector('.html5-video-player'); if(yt&&typeof yt.pauseVideo==='function'){yt.pauseVideo();} var v=document.querySelector('video'); if(v&&!v.paused){ if(window.__orbit_orig_pause){ window.__orbit_orig_pause.call(v); } else { v.pause(); } } var btn=document.querySelector('button.player-control-play-pause-icon, .ytp-play-button, button[aria-label=\"Pause video\"]'); if(btn) btn.click(); })();"
            }
            wv.evaluateJavascript(script, null)
          }
        }
      } else if (intent?.action == ACTION_PIP_NEXT) {
        BraveWebView.activeWebView?.get()?.let { wv ->
          wv.post {
            val script = "(function(){ var yt=document.getElementById('movie_player')||document.getElementById('player')||document.querySelector('.html5-video-player'); if(yt&&typeof yt.nextVideo==='function'){yt.nextVideo();return;} var nextBtn=document.querySelector('.ytp-next-button, button[aria-label=\"Next video\"], button[aria-label=\"Next (SHIFT+n)\"], button.ytp-next-button'); if(nextBtn){nextBtn.click();return;} var genericNext=document.querySelector('[data-action=\"next\"], .next-button, .vjs-next-control'); if(genericNext){genericNext.click();return;} var v=document.querySelector('video'); if(v&&isFinite(v.duration)&&v.duration>0){v.currentTime=Math.max(0,v.duration-0.5);} })();"
            wv.evaluateJavascript(script, null)
          }
        }
        try {
          val reactApp = application as? com.facebook.react.ReactApplication
          val reactContext = reactApp?.reactNativeHost?.reactInstanceManager?.currentReactContext
          reactContext
            ?.getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("onNotificationMediaAction", "next")
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
    updatePipState(this, false, false, null)

    try {
      val filter = IntentFilter().apply {
        addAction(ACTION_PIP_AUDIO)
        addAction(ACTION_PIP_PLAY_PAUSE)
        addAction(ACTION_PIP_NEXT)
      }
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
    if (isInPictureInPictureMode) {
      BraveWebView.activeWebView?.get()?.let { wv ->
        wv.post {
          try {
            wv.onResume()
            wv.resumeTimers()
            val script = "(function(){ var yt=document.getElementById('movie_player')||document.getElementById('player')||document.querySelector('.html5-video-player'); if(yt&&typeof yt.playVideo==='function'){yt.playVideo();} var v=document.querySelector('video'); if(v&&v.paused){v.play().catch(function(){});} })();"
            wv.evaluateJavascript(script, null)
          } catch (e: Exception) {}
        }
      }
    }
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
