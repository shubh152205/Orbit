package com.streamnest.app.adblock

import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativecommunity.webview.RNCWebViewManager
import com.reactnativecommunity.webview.RNCWebViewWrapper

/**
 * Custom RNCWebViewManager injecting BraveShieldsWebViewClient with native JNI ad-blocking
 */
class BraveShieldsWebViewManager : RNCWebViewManager() {

    override fun addEventEmitters(reactContext: ThemedReactContext, viewWrapper: RNCWebViewWrapper) {
        super.addEventEmitters(reactContext, viewWrapper)

        // Install BraveShieldsWebViewClient on the underlying WebView
        val webView = viewWrapper.webView
        webView.webViewClient = BraveShieldsWebViewClient(reactContext)
    }
}
