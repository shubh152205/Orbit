package com.streamnest.app.adblock

import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativecommunity.webview.RNCWebViewManager
import com.reactnativecommunity.webview.RNCWebViewWrapper

/**
 * Custom RNCWebViewManager injecting BraveWebView and BraveShieldsWebViewClient
 * with native JNI ad-blocking and continuous background media streaming.
 */
class BraveShieldsWebViewManager : RNCWebViewManager() {

    override fun createViewInstance(context: ThemedReactContext): RNCWebViewWrapper {
        val webView = BraveWebView(context)
        return createViewInstance(context, webView)
    }

    override fun addEventEmitters(reactContext: ThemedReactContext, viewWrapper: RNCWebViewWrapper) {
        super.addEventEmitters(reactContext, viewWrapper)

        // Install BraveShieldsWebViewClient on the underlying WebView
        val webView = viewWrapper.webView
        webView.webViewClient = BraveShieldsWebViewClient(reactContext)
    }
}
