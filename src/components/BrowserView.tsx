import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { WebView, WebViewProps } from 'react-native-webview'
import {
  shouldBlockRequest,
  BRAVE_SHIELDS_INJECTED_JS,
  BACKGROUND_PLAY_EARLY_JS,
} from '../services/braveShields'
import { generateWebsiteThemeJS, ThemeMode } from '../services/themeEngine'
import { VideoStreamItem } from '../types'

export const USER_AGENT_MOBILE =
  Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1 Orbit/1.0'
    : 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UD1A.230803.041) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Mobile Safari/537.36 Orbit/1.0'

export const USER_AGENT_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Orbit/1.0'

export interface BrowserViewProps {
  url: string
  isDark: boolean
  themeMode?: ThemeMode
  isDesktopMode?: boolean
  shieldsEnabled?: boolean
  style?: StyleProp<ViewStyle>
  onNavigationStateChange?: (navState: any) => void
  onLoadProgress?: (progress: number) => void
  onLoadStart?: () => void
  onLoadEnd?: () => void
  onError?: (error: any) => void
  onMediaDetected?: (media: VideoStreamItem) => void
  onVideoStreamStatus?: (
    isStreaming: boolean,
    mediaInfo?: {
      title?: string
      duration?: number
      currentTime?: number
      rect?: { x: number; y: number; width: number; height: number }
    }
  ) => void
  onBlockedAd?: (count?: number) => void
  renderError?: (errorDomain?: string, errorCode?: number, errorDesc?: string) => React.ReactElement
}

export interface BrowserViewRef {
  goBack: () => void
  goForward: () => void
  reload: () => void
  stopLoading: () => void
  injectJavaScript: (script: string) => void
  getWebView: () => WebView | null
}

/**
 * BrowserView
 * Production-grade Chromium/WebKit WebView engine.
 * 
 * Implements:
 * 1. Hardware acceleration (`androidLayerType="hardware"`) avoiding black surface glitches during native PiP.
 * 2. Background audio keep-alive & Page Visibility API spoofing (`BACKGROUND_PLAY_EARLY_JS`).
 * 3. Native theme synchronization (`forceDarkOn={isDark}` + standard web platform theme signaling).
 * 4. Privacy shields & request blocking.
 * 5. Native HTML5 media stream detection.
 */
export const BrowserView = forwardRef<BrowserViewRef, BrowserViewProps>(
  (
    {
      url,
      isDark,
      themeMode,
      isDesktopMode = false,
      shieldsEnabled = true,
      style,
      onNavigationStateChange,
      onLoadProgress,
      onLoadStart,
      onLoadEnd,
      onError,
      onMediaDetected,
      onVideoStreamStatus,
      onBlockedAd,
      renderError,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null)
    const effectiveThemeMode = themeMode || (isDark ? 'dark' : 'light')

    // Expose imperative browser controls
    useImperativeHandle(ref, () => ({
      goBack: () => webViewRef.current?.goBack(),
      goForward: () => webViewRef.current?.goForward(),
      reload: () => webViewRef.current?.reload(),
      stopLoading: () => webViewRef.current?.stopLoading(),
      injectJavaScript: (script: string) => webViewRef.current?.injectJavaScript(script),
      getWebView: () => webViewRef.current,
    }))

    // Re-inject theme in real-time when themeMode or isDark switches
    useEffect(() => {
      const themeScript = generateWebsiteThemeJS(effectiveThemeMode, isDark)
      webViewRef.current?.injectJavaScript(themeScript)
    }, [effectiveThemeMode, isDark])

    // Stream Sniffer JS: Detects HTML5 video play, src, and active video streaming status
    const STREAM_SNIFFER_JS = `
      (function() {
        try {
          function reportMedia(videoEl) {
            if (!videoEl) return;
            var src = videoEl.currentSrc || videoEl.src;
            if (!src) {
              var source = videoEl.querySelector('source');
              if (source) src = source.src;
            }
            if (src && typeof src === 'string' && src.startsWith('http')) {
              var title = document.title || 'Web Video Stream';
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'STREAM_DETECTED',
                sourceUrl: src,
                title: title,
                posterUrl: videoEl.poster || ''
              }));
            }
          }

          function isMainVideo(v) {
            if (!v) return false;
            var rect = v.getBoundingClientRect();
            // Video element must have visible layout dimensions
            if (rect.width < 160 || rect.height < 90) return false;

            // YouTube specific: filter out feed auto-play preview snippets
            if (window.location.hostname.indexOf('youtube.com') !== -1) {
              var isWatchPage = window.location.pathname.indexOf('/watch') !== -1 ||
                                window.location.pathname.indexOf('/shorts') !== -1 ||
                                window.location.pathname.indexOf('/live') !== -1;
              if (!isWatchPage) {
                // If not on a dedicated watch/shorts page, ignore inline previews in feed/search
                if (v.closest('ytm-inline-playback-renderer') ||
                    v.closest('.ytm-inline-playback-player') ||
                    v.closest('ytm-item-section-renderer')) {
                  return false;
                }
              }
            }
            return true;
          }

          function checkVideoPlayback() {
            var vids = document.querySelectorAll('video');
            var isPlaying = false;
            var activeVid = null;
            var activeRect = null;
            for (var i = 0; i < vids.length; i++) {
              var v = vids[i];
              if (v && !v.paused && !v.ended && v.currentTime > 0 && v.readyState >= 2 && isMainVideo(v)) {
                isPlaying = true;
                activeVid = v;
                var r = v.getBoundingClientRect();
                activeRect = {
                  x: Math.round(r.left),
                  y: Math.round(r.top),
                  width: Math.round(r.width),
                  height: Math.round(r.height)
                };
                break;
              }
            }
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'VIDEO_STREAM_STATUS',
                isStreaming: isPlaying,
                title: document.title || 'Web Video Stream',
                duration: activeVid ? (activeVid.duration || 0) : 0,
                currentTime: activeVid ? (activeVid.currentTime || 0) : 0,
                rect: activeRect
              }));
            }
          }

          document.addEventListener('play', function(e) {
            if (e.target && e.target.tagName === 'VIDEO') {
              reportMedia(e.target);
              checkVideoPlayback();
            }
          }, true);

          document.addEventListener('playing', function(e) {
            if (e.target && e.target.tagName === 'VIDEO') {
              checkVideoPlayback();
            }
          }, true);

          document.addEventListener('pause', function(e) {
            if (e.target && e.target.tagName === 'VIDEO') {
              checkVideoPlayback();
            }
          }, true);

          document.addEventListener('ended', function(e) {
            if (e.target && e.target.tagName === 'VIDEO') {
              checkVideoPlayback();
            }
          }, true);

          document.addEventListener('loadeddata', function(e) {
            if (e.target && e.target.tagName === 'VIDEO') {
              reportMedia(e.target);
              checkVideoPlayback();
            }
          }, true);

          document.addEventListener('emptied', checkVideoPlayback, true);
          document.addEventListener('abort', checkVideoPlayback, true);

          setInterval(checkVideoPlayback, 1500);
        } catch(e) {}
      })();
      true;
    `

    // Combined script to inject before any page content or scripts load
    const injectedBeforeContentLoaded = `
      ${BACKGROUND_PLAY_EARLY_JS}
      ${generateWebsiteThemeJS(isDark ? 'dark' : 'light', isDark)}
      ${STREAM_SNIFFER_JS}
      (function() {
        // Ensure standard mobile viewport if missing
        var meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'viewport';
          meta.content = 'width=device-width, initial-scale=1.0';
          if (document.head) document.head.appendChild(meta);
        }

        // Top spacing element so web headers sit gracefully below the floating glass island
        function applySpacer() {
          if (!document.body) return;
          if (!document.getElementById('__streamnest_island_spacer')) {
            var spacer = document.createElement('div');
            spacer.id = '__streamnest_island_spacer';
            spacer.style.cssText = 'height: 52px; width: 100%; pointer-events: none; clear: both; display: block;';
            document.body.insertBefore(spacer, document.body.firstChild);
          }
        }
        if (document.body) applySpacer();
        else document.addEventListener('DOMContentLoaded', applySpacer);
      })();
      true;
    `

    // Handle messages sent from the WebView
    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data)
        if (data.type === 'STREAM_DETECTED' && data.sourceUrl) {
          onMediaDetected?.({
            id: `sniff-${Date.now()}`,
            title: data.title || 'Detected Stream',
            sourceUrl: data.sourceUrl,
            posterUrl: data.posterUrl || '',
            quality: 'HD Stream',
          })
        } else if (data.type === 'STREAM_SNIFFED' && data.sourceUrl) {
          onMediaDetected?.({
            id: `sniff-${Date.now()}`,
            title: data.title || 'Soul Cinema Stream',
            sourceUrl: data.sourceUrl,
            posterUrl: '',
            quality: '1080p Ultra',
            duration: data.duration ? `${Math.round(data.duration / 60)} min` : undefined,
          })
        } else if (data.type === 'VIDEO_STREAM_STATUS') {
          onVideoStreamStatus?.(Boolean(data.isStreaming), {
            title: data.title,
            duration: data.duration,
            currentTime: data.currentTime,
            rect: data.rect,
          })
        } else if (data.type === 'SHIELDS_ADS_BLOCKED') {
          onBlockedAd?.(data.count)
        } else if (data.type === 'AD_BLOCKED') {
          onBlockedAd?.()
        }
      } catch {}
    }

    // Network Request Interception for Brave Shields
    const handleShouldStartLoadWithRequest = (request: any) => {
      const shouldBlock = shouldBlockRequest(request.url, shieldsEnabled)
      if (shouldBlock) {
        onBlockedAd?.()
        return false
      }
      return true
    }

    const NativeWebView = WebView as any

    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#06070a' : '#f1f5f9' }, style]}>
        <NativeWebView
          ref={webViewRef}
          source={{ uri: url }}
          style={[styles.webView, { backgroundColor: isDark ? '#06070a' : '#ffffff' }]}
          userAgent={isDesktopMode ? USER_AGENT_DESKTOP : USER_AGENT_MOBILE}
          // Hardware acceleration preventing black surface decode bug in Android PiP
          androidLayerType="hardware"
          // Native Chromium media & dark-mode features
          forceDarkOn={isDark}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          allowsProtectedMedia={true}
          allowsPictureInPictureMediaPlayback={true}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
          injectedJavaScriptForMainFrameOnly={false}
          injectedJavaScriptBeforeContentLoaded={injectedBeforeContentLoaded}
          injectedJavaScript={BRAVE_SHIELDS_INJECTED_JS}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          scalesPageToFit={Platform.OS === 'android'}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={true}
          overScrollMode="never"
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          mixedContentMode="always"
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows={false}
          onLoadStart={() => {
            onVideoStreamStatus?.(false)
            onLoadStart?.()
          }}
          onLoadEnd={() => {
            onLoadEnd?.()
            const themeScript = generateWebsiteThemeJS(effectiveThemeMode, isDark)
            webViewRef.current?.injectJavaScript(themeScript)
          }}
          onLoadProgress={({ nativeEvent }: any) => {
            onLoadProgress?.(nativeEvent.progress)
          }}
          onNavigationStateChange={(navState: any) => {
            onNavigationStateChange?.(navState)
            // Re-apply theme on client-side router SPA route changes
            const themeScript = generateWebsiteThemeJS(effectiveThemeMode, isDark)
            webViewRef.current?.injectJavaScript(themeScript)
          }}
          renderError={
            renderError ||
            ((errorDomain?: string, errorCode?: number, errorDesc?: string) => (
              <View style={styles.errorContainer}>
                {/* Native error fallback handled gracefully */}
              </View>
            ))
          }
        />
      </View>
    )
  }
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#06070a',
  },
})
