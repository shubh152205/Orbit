package com.streamnest.app.adblock

import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
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

    @ReactProp(name = "forceDarkOn")
    override fun setForceDarkOn(viewWrapper: RNCWebViewWrapper, enabled: Boolean) {
        super.setForceDarkOn(viewWrapper, enabled)
        val webView = viewWrapper.webView as? BraveWebView
        webView?.updateTheme(enabled)
    }
}
