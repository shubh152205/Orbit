package com.streamnest.app.adblock

import android.graphics.Bitmap
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import com.facebook.react.bridge.ReactContext
import com.reactnativecommunity.webview.RNCWebViewClient
import java.io.ByteArrayInputStream

/**
 * Custom WebViewClient embedding Brave & AdGuard Native Rule Engine
 * Intercepts requests at native network layer and returns empty WebResourceResponse for ads.
 */
class BraveShieldsWebViewClient(private val reactContext: ReactContext?) : RNCWebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        if (view == null || request == null) {
            return super.shouldInterceptRequest(view, request)
        }

        try {
            val requestUri = request.url ?: return super.shouldInterceptRequest(view, request)
            val url = requestUri.toString()
            val host = requestUri.host ?: ""

            // Determine First-Party Host
            val pageUri = view.url?.let { Uri.parse(it) }
            val firstPartyHost = pageUri?.host ?: ""

            val isThirdParty = if (host.isNotEmpty() && firstPartyHost.isNotEmpty()) {
                !host.equals(firstPartyHost, ignoreCase = true) &&
                        !host.endsWith(".$firstPartyHost", ignoreCase = true) &&
                        !firstPartyHost.endsWith(".$host", ignoreCase = true)
            } else {
                false
            }

            // Determine Resource Type
            val resourceType = detectResourceType(request, requestUri)

            // Evaluate against Brave & AdGuard Native Engine via JNI
            val isBlocked = BraveNativeEngine.shouldBlockUrl(
                url,
                host,
                firstPartyHost,
                resourceType,
                isThirdParty
            )

            if (isBlocked) {
                val total = BraveNativeEngine.incrementBlockedCount()

                // Notify React Native bridge of blocked ad
                reactContext?.let { ctx ->
                    BraveShieldsModule.sendAdBlockedEvent(ctx, url, host, resourceType, total)
                }

                // Return safe WebResourceResponse: return "{}" for JSON/XHR endpoints to prevent JSON.parse syntax crashes
                val acceptHeader = request.requestHeaders?.get("Accept")?.lowercase() ?: ""
                val isJson = resourceType == "xhr" || url.contains("json") || url.contains("youtubei") || acceptHeader.contains("application/json")
                val mimeType = if (isJson) "application/json" else if (resourceType == "script") "application/javascript" else "text/plain"
                val responseBytes = if (isJson) "{}".toByteArray(Charsets.UTF_8) else ByteArray(0)

                return WebResourceResponse(
                    mimeType,
                    "UTF-8",
                    ByteArrayInputStream(responseBytes)
                )
            }
        } catch (t: Throwable) {
            // Guarantee WebView never crashes on interception errors
        }

        return super.shouldInterceptRequest(view, request)
    }

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)

        // Inject cosmetic CSS hiding rules via evaluateJavascript
        if (view != null && !url.isNullOrEmpty()) {
            val host = Uri.parse(url).host ?: ""
            val script = BraveNativeEngine.getCosmeticInjectionJs(host)
            if (script.isNotEmpty()) {
                view.evaluateJavascript(script, null)
            }
        }
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)

        // Re-inject cosmetic CSS to defuse delayed DOM ad insertions
        if (view != null && !url.isNullOrEmpty()) {
            val host = Uri.parse(url).host ?: ""
            val script = BraveNativeEngine.getCosmeticInjectionJs(host)
            if (script.isNotEmpty()) {
                view.evaluateJavascript(script, null)
            }
        }
    }

    private fun detectResourceType(request: WebResourceRequest, uri: Uri): String {
        if (request.isForMainFrame) {
            return "main_frame"
        }

        val path = (uri.path ?: "").lowercase()
        val acceptHeader = request.requestHeaders?.get("Accept")?.lowercase() ?: ""

        return when {
            path.endsWith(".js") || acceptHeader.contains("javascript") -> "script"
            path.endsWith(".css") || acceptHeader.contains("text/css") -> "stylesheet"
            path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".jpeg") ||
                    path.endsWith(".gif") || path.endsWith(".webp") || path.endsWith(".svg") ||
                    path.endsWith(".ico") || acceptHeader.contains("image/") -> "image"
            path.endsWith(".woff") || path.endsWith(".woff2") || path.endsWith(".ttf") ||
                    path.endsWith(".otf") || acceptHeader.contains("font/") -> "font"
            path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".m3u8") ||
                    path.endsWith(".mp3") || path.endsWith(".ts") || acceptHeader.contains("video/") ||
                    acceptHeader.contains("audio/") -> "media"
            acceptHeader.contains("application/json") ||
                    request.requestHeaders?.get("X-Requested-With") != null -> "xmlhttprequest"
            else -> "subdocument"
        }
    }
}
