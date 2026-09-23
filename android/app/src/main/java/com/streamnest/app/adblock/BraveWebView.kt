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

    /**
     * Applies native Chromium algorithmic darkening to all web content.
     * Android 13+ (API 33+) requires isAlgorithmicDarkeningAllowed.
     */
    fun updateTheme(isDark: Boolean) {
        post {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    settings.isAlgorithmicDarkeningAllowed = isDark
                } else if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                    WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, isDark)
                }

                if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                    val forceDarkMode = if (isDark) WebSettingsCompat.FORCE_DARK_ON else WebSettingsCompat.FORCE_DARK_OFF
                    WebSettingsCompat.setForceDark(settings, forceDarkMode)
                }

                if (isDark && WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK_STRATEGY)) {
                    WebSettingsCompat.setForceDarkStrategy(
                        settings,
                        WebSettingsCompat.DARK_STRATEGY_PREFER_WEB_THEME_OVER_USER_AGENT_DARKENING
                    )
                }
            } catch (e: Exception) {
                // Ignore if settings unavailable
            }
        }
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
}

