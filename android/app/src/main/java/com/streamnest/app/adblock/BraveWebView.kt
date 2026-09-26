package com.streamnest.app.adblock

import android.os.Build
import android.view.View
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativecommunity.webview.RNCWebView
import java.lang.ref.WeakReference

/**
 * BraveWebView
 * Subclass of RNCWebView implementing Brave Browser's core engine enhancements:
 * 1. Background media persistence: Intercepts Android window visibility signals,
 *    passing View.VISIBLE to the underlying Chromium WebContents engine so that
 *    HTML5 background audio and video decoding is never suspended on screen-off or app minimize.
 * 2. Native Algorithmic Darkening for Android 13+ (API 33+) and Force Dark strategy.
 * 3. Static activeWebView reference for direct native notification media playback controls.
 */
class BraveWebView(context: ThemedReactContext) : RNCWebView(context) {

    companion object {
        @Volatile
        var isBackgroundPlayEnabled: Boolean = true

        @Volatile
        var activeWebView: WeakReference<BraveWebView>? = null
    }

    init {
        activeWebView = WeakReference(this)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        activeWebView = WeakReference(this)
    }


    override fun getWindowVisibility(): Int {
        if (isBackgroundPlayEnabled) {
            return View.VISIBLE
        }
        return super.getWindowVisibility()
    }

    override fun onWindowVisibilityChanged(visibility: Int) {
        // When background play is enabled, forward View.VISIBLE to Chromium's
        // WebContents so it never suspends audio decoding when the screen turns off or app is minimized.
        if (isBackgroundPlayEnabled) {
            super.onWindowVisibilityChanged(View.VISIBLE)
        } else {
            super.onWindowVisibilityChanged(visibility)
        }
    }

    override fun onPause() {
        if (isBackgroundPlayEnabled) {
            // Keep Chromium media decoding and timers active during Picture-in-Picture and background mode
            return
        }
        super.onPause()
    }

    override fun pauseTimers() {
        if (isBackgroundPlayEnabled) {
            // Prevent freezing JS timers so video and audio playback continues uninterrupted
            return
        }
        super.pauseTimers()
    }
}

