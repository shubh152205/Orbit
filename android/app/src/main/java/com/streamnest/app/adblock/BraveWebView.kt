package com.streamnest.app.adblock

import android.view.View
import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativecommunity.webview.RNCWebView

/**
 * BraveWebView
 * Subclass of RNCWebView implementing Brave Browser's background media persistence:
 * Intercepts Android's View.GONE window visibility signal when the app is backgrounded
 * or when the device screen turns off, passing View.VISIBLE to the underlying Chromium
 * WebContents engine so that HTML5 background audio playback is never suspended.
 */
class BraveWebView(context: ThemedReactContext) : RNCWebView(context) {

    companion object {
        @Volatile
        var isBackgroundPlayEnabled: Boolean = true
    }

    override fun onWindowVisibilityChanged(visibility: Int) {
        // When background play is enabled and the system tries to hide the view (screen off or minimized),
        // we forward View.VISIBLE to Chromium's WebContents so it keeps audio decoding alive.
        if (isBackgroundPlayEnabled && visibility == View.GONE) {
            super.onWindowVisibilityChanged(View.VISIBLE)
        } else {
            super.onWindowVisibilityChanged(visibility)
        }
    }
}
