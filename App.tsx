import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  BackHandler,
  Animated,
  Modal,
  PermissionsAndroid,
  Alert,
  useColorScheme,
  DeviceEventEmitter,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Audio } from 'expo-av'
import {
  PictureInPicture2,
  Tv,
  Sparkles,
  X,
  Globe,
  ArrowLeft,
  ArrowRight,
  Compass,
  Download,
  ShieldCheck,
  Settings,
  Film,
  Moon,
  Headphones,
} from 'lucide-react-native'

import { LiquidGlassNavBar } from './src/components/LiquidGlassNavBar'
import { BrowserView, BrowserViewRef } from './src/components/BrowserView'
import { enterSystemPictureInPicture, setSystemPipVideoPlaybackState } from './src/services/pipService'
import { LiquidGlassContainer } from './src/components/LiquidGlass'
import { NativeDownloadManager } from './src/components/NativeDownloadManager'
import { NativePortalsDirectory } from './src/components/NativePortalsDirectory'
import { NativeSettingsModal } from './src/components/NativeSettingsModal'
import { SoulVideoPlayer } from './src/components/SoulVideoPlayer'
import { BraveShieldsModal } from './src/components/BraveShieldsModal'
import { NativeHomeScreen } from './src/components/NativeHomeScreen'
import {
  shouldBlockRequest,
  BRAVE_SHIELDS_INJECTED_JS,
  BACKGROUND_PLAY_EARLY_JS,
} from './src/services/braveShields'
import { backgroundAudio } from './src/services/backgroundAudio'
import { nativeShields } from './src/services/nativeShields'
import {
  ThemeMode,
  STORAGE_THEME_MODE_KEY,
  generateWebsiteThemeJS,
} from './src/services/themeEngine'
import { AppTab, VideoStreamItem } from './src/types'
import { THEME, getThemeColors } from './src/theme/tokens'

const DEFAULT_URL = 'https://cineby.net'
const STORAGE_URL_KEY = '@streamnest_last_url'
const STORAGE_HISTORY_KEY = '@streamnest_history_urls'

const USER_AGENT_MOBILE =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
const USER_AGENT_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Orbit Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Orbit App Notice</Text>
          <Text style={styles.errorDesc}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={styles.errorBtn}
          >
            <Text style={styles.errorBtnText}>Reload App</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )
    }
    return this.props.children
  }
}

function MainStreamNestApp() {
  const insets = useSafeAreaInsets()
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_URL)
  const [activeBrowserUrl, setActiveBrowserUrl] = useState(DEFAULT_URL)
  const [pageTitle, setPageTitle] = useState('')
  const [recentUrls, setRecentUrls] = useState<string[]>([
    'https://cineby.net',
    'https://fmhy.net',
    'https://vidsrc.to',
  ])
  const [activeTab, setActiveTab] = useState<AppTab>('browser')
  const [isCinemaMode, setIsCinemaMode] = useState(false)
  const [isDesktopMode, setIsDesktopMode] = useState(false)

  // Floating Modals triggered from Top Bar
  const [showHomeModal, setShowHomeModal] = useState(false)
  const [showPortalsModal, setShowPortalsModal] = useState(false)
  const [showDownloadsModal, setShowDownloadsModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showShieldsModal, setShowShieldsModal] = useState(false)
  const systemColorScheme = useColorScheme()
  const [webThemeMode, setWebThemeMode] = useState<ThemeMode>('dark')
  const [isVideoPlayingOnPage, setIsVideoPlayingOnPage] = useState(false)
  const [isCinemaPlaying, setIsCinemaPlaying] = useState(false)

  // Load saved appearance theme mode
  useEffect(() => {
    ;(async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_THEME_MODE_KEY)
        if (saved && (saved === 'dark' || saved === 'light' || saved === 'auto')) {
          setWebThemeMode(saved as ThemeMode)
        }
      } catch {}
    })()
  }, [])

  const isAppDark = webThemeMode === 'auto' ? systemColorScheme === 'dark' : webThemeMode === 'dark'
  const appColors = getThemeColors(isAppDark)

  // Dynamically signal the active webpage whenever theme mode changes in real-time
  useEffect(() => {
    const isDark = webThemeMode === 'auto' ? systemColorScheme === 'dark' : webThemeMode === 'dark'
    const themeScript = generateWebsiteThemeJS(webThemeMode, isDark)
    browserRef.current?.injectJavaScript(themeScript)
  }, [webThemeMode, systemColorScheme])

  // Brave Shields & Soul Clean Mode State
  const [shieldsEnabled, setShieldsEnabled] = useState(true)
  const [blockedAdsCount, setBlockedAdsCount] = useState(0)
  const [isCleanMode, setIsCleanMode] = useState(false)

  // Sync state with Native Brave/AdGuard JNI Engine
  useEffect(() => {
    nativeShields.setShieldsEnabled(shieldsEnabled)
    const unsubscribe = nativeShields.onAdBlocked((event) => {
      setBlockedAdsCount((prev) => Math.max(prev, event.totalBlocked))
    })
    return () => unsubscribe()
  }, [shieldsEnabled])

  const handleToggleShields = () => {
    const next = !shieldsEnabled
    setShieldsEnabled(next)
    nativeShields.setShieldsEnabled(next)
  }

  // Real Storage Permission State
  const [hasStoragePermission, setHasStoragePermission] = useState(false)
  const [activeDownloadsCount, setActiveDownloadsCount] = useState(0)

  // Real Browser State
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Stream Sniffer Alert Banner
  const [sniffedStream, setSniffedStream] = useState<VideoStreamItem | null>(null)
  const dismissedStreamUrlsRef = useRef<Set<string>>(new Set())

  // Dynamic Island Top Offset calculations (ensures full visibility below status bar)
  const topIslandPosition = Math.max(insets.top + (Platform.OS === 'ios' ? 4 : 8), 38)
  const progressBarTop = topIslandPosition + 52
  const sniffedBannerTop = progressBarTop + 4

  // Picture-in-Picture & Video Continuity State
  const [isPipActive, setIsPipActive] = useState(false)
  const [autoStartPip, setAutoStartPip] = useState(false)
  const [videoPlaybackPositionMillis, setVideoPlaybackPositionMillis] = useState(0)
  const videoRectRef = useRef<{ x: number; y: number; width: number; height: number } | undefined>(undefined)

  // Listen for native Android Picture-in-Picture mode transitions
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      'onPictureInPictureModeChanged',
      (event: { isInPictureInPictureMode: boolean }) => {
        const inPip = Boolean(event.isInPictureInPictureMode)
        setIsPipActive(inPip)
        if (inPip) {
          browserRef.current?.injectJavaScript(`
            (function() {
              window.__orbit_pip_active = true;
              window.__orbit_user_paused = false;
              var s = document.getElementById('__streamnest_island_spacer');
              if (s) s.style.display = 'none';
              var v = document.querySelector('video');
              if (!v) return;

              window.__streamnest_pip_saved_scroll = { x: window.scrollX, y: window.scrollY };
              window.scrollTo(0, 0);

              var style = document.getElementById('__streamnest_pip_style');
              if (!style) {
                style = document.createElement('style');
                style.id = '__streamnest_pip_style';
                (document.head || document.documentElement).appendChild(style);
              }
              style.textContent = 'html, body { overflow: hidden !important; background: #000 !important; margin: 0 !important; padding: 0 !important; width: 100vw !important; height: 100vh !important; } ytm-mobile-topbar-renderer, ytm-pivot-bar-renderer, #below, .watch-below-the-player, #related, #comments, ytm-item-section-renderer, header, nav, footer, .player-controls-bottom, .player-controls-middle, .player-controls-top, .ytp-chrome-top, .ytp-chrome-bottom, .ytp-gradient-top, .ytp-gradient-bottom, .ytp-bezel, .ytp-cued-thumbnail-overlay, .ytp-pause-overlay, .ytp-upnext, .video-ads, .ytp-ad-module, .ytp-ad-overlay-container, #__streamnest_island_spacer { display: none !important; opacity: 0 !important; pointer-events: none !important; } #player, #player-container-id, .player-container, .html5-video-player, .html5-video-container { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; max-width: 100vw !important; max-height: 100vh !important; margin: 0 !important; padding: 0 !important; z-index: 2147483646 !important; background: #000 !important; } video { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; max-width: 100vw !important; max-height: 100vh !important; z-index: 2147483647 !important; object-fit: contain !important; background: #000 !important; }';

              // Ensure video keeps playing smoothly during and after entering PiP mode
              var playMedia = function() {
                var yt = document.getElementById('movie_player') || document.getElementById('player') || document.querySelector('.html5-video-player');
                if (yt && typeof yt.playVideo === 'function') { yt.playVideo(); }
                if (v && v.paused) { v.play().catch(function(){}); }
              };
              playMedia();
              setTimeout(playMedia, 250);
              setTimeout(playMedia, 600);
              setTimeout(playMedia, 1200);
            })();
            true;
          `)
        } else {
          browserRef.current?.injectJavaScript(`
            (function() {
              window.__orbit_pip_active = false;
              var s = document.getElementById('__streamnest_island_spacer');
              if (s) s.style.display = 'block';
              var style = document.getElementById('__streamnest_pip_style');
              if (style) style.remove();

              // Clear stuck inline dimensions left by PiP resize to fix player shrinkage bug
              var targets = document.querySelectorAll('#player, #player-container-id, .player-container, .html5-video-player, .html5-video-container, video');
              for (var i = 0; i < targets.length; i++) {
                var el = targets[i];
                if (el) {
                  el.style.width = '';
                  el.style.height = '';
                  el.style.top = '';
                  el.style.left = '';
                  el.style.position = '';
                  el.style.maxWidth = '';
                  el.style.maxHeight = '';
                  el.style.zIndex = '';
                }
              }

              if (window.__streamnest_pip_saved_scroll) {
                window.scrollTo(window.__streamnest_pip_saved_scroll.x, window.__streamnest_pip_saved_scroll.y);
              }
              window.dispatchEvent(new Event('resize'));
              window.dispatchEvent(new Event('orientationchange'));
              var yt = document.getElementById('movie_player') || document.getElementById('player') || document.querySelector('.html5-video-player');
              if (yt && typeof yt.setSize === 'function') { yt.setSize(); }
              setTimeout(function() {
                window.dispatchEvent(new Event('resize'));
                if (yt && typeof yt.setSize === 'function') { yt.setSize(); }
              }, 300);
            })();
            true;
          `)
        }
      }
    )

    const audioSub = DeviceEventEmitter.addListener('onPipAudioModeTriggered', () => {
      setBackgroundPlayEnabled(true)
      setIsPipActive(false)
    })

    return () => {
      sub.remove()
      audioSub.remove()
    }
  }, [])

  // Skip to next video on YouTube or generic HTML5 media
  const handleSkipNext = useCallback(() => {
    browserRef.current?.injectJavaScript(`
      (function() {
        var yt = document.getElementById('movie_player') || document.getElementById('player') || document.querySelector('.html5-video-player');
        if (yt && typeof yt.nextVideo === 'function') { yt.nextVideo(); return; }
        var nextBtn = document.querySelector('.ytp-next-button, button[aria-label="Next video"], button[aria-label="Next (SHIFT+n)"], button.ytp-next-button');
        if (nextBtn) { nextBtn.click(); return; }
        var genericNext = document.querySelector('[data-action="next"], .next-button, .vjs-next-control');
        if (genericNext) { genericNext.click(); return; }
        var v = document.querySelector('video');
        if (v && isFinite(v.duration) && v.duration > 0) { v.currentTime = Math.max(0, v.duration - 0.5); }
      })();
      true;
    `)
  }, [])

  // Listen for interactive Android notification player controls
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      'onNotificationMediaAction',
      (action: string) => {
        if (action === 'play') {
          if (isCinemaMode) {
            setIsCinemaPlaying(true)
          } else {
            browserRef.current?.injectJavaScript(`
              (function() {
                window.__orbit_user_paused = false;
                var yt = document.getElementById('movie_player') || document.getElementById('player') || document.querySelector('.html5-video-player');
                if (yt && typeof yt.playVideo === 'function') { yt.playVideo(); }
                var v = document.querySelector('video');
                if (v && v.paused) v.play().catch(function(){});
                var btn = document.querySelector('button.player-control-play-pause-icon, .ytp-play-button, button[aria-label="Play video"]');
                if (btn) btn.click();
                var overlay = document.querySelector('.player-controls-middle, .ytp-bezel');
                if (overlay) { overlay.style.display = 'none'; setTimeout(function(){ overlay.style.display = ''; }, 250); }
              })();
              true;
            `)
          }
        } else if (action === 'pause') {
          if (isCinemaMode) {
            setIsCinemaPlaying(false)
          } else {
            browserRef.current?.injectJavaScript(`
              (function() {
                window.__orbit_user_paused = true;
                var yt = document.getElementById('movie_player') || document.getElementById('player') || document.querySelector('.html5-video-player');
                if (yt && typeof yt.pauseVideo === 'function') { yt.pauseVideo(); }
                var v = document.querySelector('video');
                if (v && !v.paused) {
                  if (window.__orbit_orig_pause) { window.__orbit_orig_pause.call(v); }
                  else { v.pause(); }
                }
                var btn = document.querySelector('button.player-control-play-pause-icon, .ytp-play-button, button[aria-label="Pause video"]');
                if (btn) btn.click();
              })();
              true;
            `)
          }
        } else if (action === 'forward') {
          browserRef.current?.injectJavaScript(`
            (function() {
              var yt = document.getElementById('movie_player') || document.getElementById('player');
              if (yt && typeof yt.seekBy === 'function') { yt.seekBy(10); return; }
              var v = document.querySelector('video');
              if (v) v.currentTime += 10;
            })();
            true;
          `)
        } else if (action === 'backward') {
          browserRef.current?.injectJavaScript(`
            (function() {
              var v = document.querySelector('video');
              if (v) v.currentTime = Math.max(0, v.currentTime - 10);
            })();
            true;
          `)
        } else if (action === 'next') {
          handleSkipNext()
        }
      }
    )
    return () => sub.remove()
  }, [isCinemaMode, handleSkipNext])

  // Streaming Engine Settings: Background Play (Soul/Brave mode) & Screen Off Display Saver
  const [backgroundPlayEnabled, setBackgroundPlayEnabled] = useState(true)
  const [autoPipEnabled, setAutoPipEnabled] = useState(true)

  useEffect(() => {
    backgroundAudio.setBackgroundPlayEnabled(backgroundPlayEnabled).catch(() => {})
  }, [backgroundPlayEnabled])

  const [isScreenOff, setIsScreenOff] = useState(false)
  const screenOffHintOpacity = useRef(new Animated.Value(1)).current
  const screenOffTimerRef = useRef<any>(null)
  const screenOffLastTapRef = useRef(0)

  // Configure Expo Audio mode for background playback & screen-off streaming
  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    }).catch((err) => console.warn('Audio background mode setup error:', err))
  }, [])

  const triggerScreenOffHint = useCallback(() => {
    screenOffHintOpacity.setValue(1)
    if (screenOffTimerRef.current) clearTimeout(screenOffTimerRef.current)
    screenOffTimerRef.current = setTimeout(() => {
      Animated.timing(screenOffHintOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start()
    }, 2800)
  }, [screenOffHintOpacity])

  const handleGlobalScreenOffTouch = useCallback(() => {
    const now = Date.now()
    if (now - screenOffLastTapRef.current < 350) {
      setIsScreenOff(false)
      screenOffLastTapRef.current = 0
    } else {
      screenOffLastTapRef.current = now
      triggerScreenOffHint()
    }
  }, [triggerScreenOffHint])
  const [activeVideo, setActiveVideo] = useState<VideoStreamItem>({
    id: 'vid-default',
    title: 'Cinematic Stream',
    sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
    duration: '12 min',
    quality: '1080p Ultra',
  })

  const browserRef = useRef<BrowserViewRef>(null)

  // Storage permission verification
  const checkStoragePermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setHasStoragePermission(true)
      return true
    }
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(
          'android.permission.READ_MEDIA_VIDEO' as any
        )
        setHasStoragePermission(granted)
        return granted
      } else {
        const readGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        )
        const writeGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        )
        const granted = readGranted && writeGranted
        setHasStoragePermission(granted)
        return granted
      }
    } catch (err) {
      console.warn('Storage permission check failed:', err)
      return false
    }
  }, [])

  const requestStoragePermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setHasStoragePermission(true)
      return true
    }
    try {
      let granted = false
      if (Platform.Version >= 33) {
        const statuses = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        ])
        granted =
          statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO] ===
            PermissionsAndroid.RESULTS.GRANTED ||
          statuses[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] ===
            PermissionsAndroid.RESULTS.GRANTED
      } else {
        const statuses = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ])
        granted =
          statuses[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          statuses[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
            PermissionsAndroid.RESULTS.GRANTED
      }
      setHasStoragePermission(granted)
      if (granted) {
        Alert.alert('Permission Granted', 'Device storage access granted. Offline videos can be saved and shared across your device.')
      } else {
        Alert.alert(
          'App Sandbox Active',
          'System media access not granted. Offline downloads will be saved directly into Orbit private app sandbox.'
        )
      }
      return granted
    } catch (err) {
      console.warn('Storage permission request error:', err)
      return false
    }
  }, [])

  useEffect(() => {
    checkStoragePermission()
  }, [checkStoragePermission])

  // Restore saved URL on startup
  useEffect(() => {
    ;(async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(STORAGE_URL_KEY)
        if (savedUrl) {
          if (savedUrl.includes('fsmy.')) {
            setCurrentUrl('https://cineby.net')
            setActiveBrowserUrl('https://cineby.net')
            await AsyncStorage.setItem(STORAGE_URL_KEY, 'https://cineby.net')
          } else {
            setCurrentUrl(savedUrl)
            setActiveBrowserUrl(savedUrl)
          }
        }
        const savedHistory = await AsyncStorage.getItem(STORAGE_HISTORY_KEY)
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory)
          const filtered = parsed.filter((u: string) => !u.includes('fsmy.'))
          const uniqueUrls = Array.from(
            new Set(['https://cineby.net', 'https://fmhy.net', ...filtered])
          ).slice(0, 8)
          setRecentUrls(uniqueUrls)
        }
      } catch (e) {
        console.warn('Failed to load state from AsyncStorage:', e)
      }
    })()
  }, [])

  const renderBrowserError = (errorDomain?: string, errorCode?: number, errorDesc?: string) => {
    const hostDisplay = currentUrl.replace(/^https?:\/\//, '').split('/')[0]
    return (
      <View style={styles.browserErrorContainer}>
        <View style={styles.browserErrorCard}>
          <View style={styles.browserErrorIcon}>
            <Globe size={24} color="#f87171" />
          </View>
          <Text style={styles.browserErrorTitle}>Webpage Not Available</Text>
          <Text style={styles.browserErrorDesc}>
            {errorDesc === 'net::ERR_NAME_NOT_RESOLVED' || !errorDesc
              ? `Could not find domain "${hostDisplay}". The website address may be misspelled or offline.`
              : errorDesc}
          </Text>

          <View style={styles.browserErrorSuggestions}>
            <Text style={styles.suggestionHeader}>Try Verified FMHY Portals:</Text>
            <TouchableOpacity
              onPress={() => handleNavigate('https://cineby.net')}
              style={styles.suggestionBtn}
            >
              <Text style={styles.suggestionBtnText}>▶ Open Cineby (Movies & Shows)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleNavigate('https://fmhy.net')}
              style={styles.suggestionBtn}
            >
              <Text style={styles.suggestionBtnText}>★ Open FMHY Official Directory</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                handleNavigate(
                  `https://www.google.com/search?q=${encodeURIComponent(hostDisplay + ' movie stream')}`
                )
              }
              style={styles.searchFallbackBtn}
            >
              <Text style={styles.searchFallbackText}>Search on Google Instead</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => browserRef.current?.reload()}
            style={styles.retryBtn}
          >
            <Text style={styles.retryBtnText}>Reload Webpage</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Android Hardware Back Button: dismiss modals, cinema mode, or navigate back in browser history
  useEffect(() => {
    const onBackPress = () => {
      if (isScreenOff) {
        setIsScreenOff(false)
        return true
      }
      if (showHomeModal) {
        setShowHomeModal(false)
        return true
      }
      if (showShieldsModal) {
        setShowShieldsModal(false)
        return true
      }
      if (showSettingsModal) {
        setShowSettingsModal(false)
        return true
      }
      if (showDownloadsModal) {
        setShowDownloadsModal(false)
        return true
      }
      if (showPortalsModal) {
        setShowPortalsModal(false)
        return true
      }
      if (isCleanMode) {
        setIsCleanMode(false)
        return true
      }
      if (isCinemaMode) {
        setIsCinemaMode(false)
        setActiveTab('browser')
        return true
      }
      if (canGoBack && browserRef.current) {
        browserRef.current.goBack()
        return true
      }
      return false
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
    return () => subscription.remove()
  }, [showHomeModal, showShieldsModal, showSettingsModal, showDownloadsModal, showPortalsModal, isCleanMode, isCinemaMode, canGoBack])

  const handleNavigate = async (url: string) => {
    setCurrentUrl(url)
    setActiveBrowserUrl(url)
    dismissedStreamUrlsRef.current.clear()
    setBlockedAdsCount(0)
    setIsVideoPlayingOnPage(false)
    try {
      await AsyncStorage.setItem(STORAGE_URL_KEY, url)
      const filtered = recentUrls.filter((u) => u !== url)
      const updated = Array.from(new Set([url, ...filtered])).slice(0, 8)
      setRecentUrls(updated)
      await AsyncStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated))
    } catch {}

    const host = url.replace(/^https?:\/\//, '').split('/')[0]
    setActiveVideo((prev) => ({
      ...prev,
      title: `${host.toUpperCase()} Stream`,
    }))
    setIsCinemaMode(false)
    setActiveTab('browser')
  }

  const isAnyVideoPlaying = (isCinemaMode && isCinemaPlaying) || (!isCinemaMode && isVideoPlayingOnPage)

  // Synchronize Android Native System PiP capability:
  // Auto-enter PiP on swipe-home is active whenever an actual video is actively playing on page or in cinema
  useEffect(() => {
    const shouldAutoPip = isAnyVideoPlaying && autoPipEnabled
    setSystemPipVideoPlaybackState(
      shouldAutoPip,
      autoPipEnabled,
      isCinemaMode ? undefined : videoRectRef.current
    ).catch(() => {})
  }, [isAnyVideoPlaying, autoPipEnabled, isCinemaMode])

  const handleTogglePip = async (posMillis?: number) => {
    if (typeof posMillis === 'number') {
      setVideoPlaybackPositionMillis(posMillis)
    }
    if (sniffedStream) {
      setActiveVideo(sniffedStream)
      setSniffedStream(null)
      setAutoStartPip(true)
      setIsCinemaMode(true)
      setActiveTab('cinema')
      return
    }

    if (!isCinemaMode) {
      // Isolate the web video in the WebView so it fills 100% of the PiP window cleanly
      browserRef.current?.injectJavaScript(`
        (function() {
          var v = document.querySelector('video');
          if (!v) return;
          window.__streamnest_pip_saved_scroll = { x: window.scrollX, y: window.scrollY };
          window.scrollTo(0, 0);
          var style = document.getElementById('__streamnest_pip_style');
          if (!style) {
            style = document.createElement('style');
            style.id = '__streamnest_pip_style';
            (document.head || document.documentElement).appendChild(style);
          }
          style.textContent = 'html, body { overflow: hidden !important; background: #000 !important; margin: 0 !important; padding: 0 !important; width: 100vw !important; height: 100vh !important; } ytm-mobile-topbar-renderer, ytm-pivot-bar-renderer, #below, .watch-below-the-player, #related, #comments, ytm-item-section-renderer, header, nav, footer, .player-controls-bottom, .player-controls-middle, .player-controls-top, .ytp-chrome-top, .ytp-chrome-bottom, .ytp-gradient-top, .ytp-gradient-bottom, .ytp-bezel, .ytp-cued-thumbnail-overlay, .ytp-pause-overlay, .ytp-upnext, .video-ads, .ytp-ad-module, .ytp-ad-overlay-container, #__streamnest_island_spacer { display: none !important; opacity: 0 !important; pointer-events: none !important; } #player, #player-container-id, .player-container, .html5-video-player, .html5-video-container { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; max-width: 100vw !important; max-height: 100vh !important; margin: 0 !important; padding: 0 !important; z-index: 2147483646 !important; background: #000 !important; } video { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; max-width: 100vw !important; max-height: 100vh !important; z-index: 2147483647 !important; object-fit: contain !important; background: #000 !important; }';

          // Keep video actively playing during PiP mode transition
          var yt = document.getElementById('movie_player') || document.getElementById('player') || document.querySelector('.html5-video-player');
          if (yt && typeof yt.playVideo === 'function') { yt.playVideo(); }
          if (v && v.paused) { v.play().catch(function(){}); }
          setTimeout(function() {
            if (yt && typeof yt.playVideo === 'function') { yt.playVideo(); }
            if (v && v.paused) { v.play().catch(function(){}); }
          }, 250);
          setTimeout(function() {
            if (yt && typeof yt.playVideo === 'function') { yt.playVideo(); }
            if (v && v.paused) { v.play().catch(function(){}); }
          }, 600);
        })();
        true;
      `)
    }

    setIsPipActive(true)
    const entered = await enterSystemPictureInPicture()
    if (!entered) {
      setIsPipActive(false)
      if (!isCinemaMode) {
        setAutoStartPip(true)
        setIsCinemaMode(true)
        setActiveTab('cinema')
      } else {
        setIsPipActive((prev) => !prev)
      }
    }
  }

  const handleToggleBackgroundAudio = useCallback(async () => {
    const nextVal = !backgroundPlayEnabled
    setBackgroundPlayEnabled(nextVal)
    await backgroundAudio.setBackgroundPlayEnabled(nextVal)
    if (!nextVal) {
      await backgroundAudio.stopKeepAlive()
    } else if (isAnyVideoPlaying) {
      const subtitle = currentUrl.replace(/^https?:\/\//, '').split('/')[0]
      const title = isCinemaMode ? activeVideo.title : (pageTitle || 'Web Video Stream')
      backgroundAudio.startKeepAlive(title, subtitle)
      backgroundAudio.updatePlaybackState(true, title, subtitle)
    }
  }, [backgroundPlayEnabled, isAnyVideoPlaying, currentUrl, isCinemaMode, activeVideo.title, pageTitle])

  const handlePlayDownloadedVideo = (video: VideoStreamItem) => {
    setActiveVideo(video)
    setIsCinemaMode(true)
    setIsCinemaPlaying(true)
    setActiveTab('cinema')
  }

  const isVideoStreaming = isPipActive || isCinemaMode || !!sniffedStream || isVideoPlayingOnPage

  // Brave Background Media Service:
  // Starts native Foreground Service with WakeLock when video is actively playing.
  // Keeps CPU awake and Chromium audio decoder active when screen is turned off or app backgrounded.
  useEffect(() => {
    const subtitle = currentUrl.replace(/^https?:\/\//, '').split('/')[0]
    if (backgroundPlayEnabled && isAnyVideoPlaying) {
      const title = isCinemaMode ? activeVideo.title : (pageTitle || 'Web Video Stream')
      backgroundAudio.startKeepAlive(title, subtitle)
      backgroundAudio.updatePlaybackState(true, title, subtitle)
    } else if (!isAnyVideoPlaying) {
      const title = isCinemaMode ? activeVideo.title : (pageTitle || 'Web Video Stream')
      backgroundAudio.updatePlaybackState(false, title, subtitle)
    }
  }, [backgroundPlayEnabled, isAnyVideoPlaying, isCinemaMode, activeVideo.title, pageTitle, currentUrl])

  return (
    <View style={[styles.rootContainer, { backgroundColor: appColors.canvas }]}>
      <StatusBar
        style={isAppDark ? 'light' : 'dark'}
        backgroundColor={appColors.canvas}
      />

      {/* Top Browser Liquid Glass Navbar - Apple Frosted Glass with Integrated Progress Rim */}
      {!isPipActive && (
        <LiquidGlassNavBar
          currentUrl={currentUrl}
          pageTitle={pageTitle}
          isLoading={isLoading}
          loadProgress={loadProgress}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          isDark={isAppDark}
          blockedAdsCount={blockedAdsCount}
          shieldsEnabled={shieldsEnabled}
          isVideoStreaming={isVideoStreaming}
          isCinemaMode={isCinemaMode}
          isDesktopMode={isDesktopMode}
          isPipActive={isPipActive}
          isHidden={isCleanMode}
          isBackgroundAudioEnabled={backgroundPlayEnabled}
          onToggleHide={() => setIsCleanMode(!isCleanMode)}
          onNavigate={handleNavigate}
          onBack={() => browserRef.current?.goBack()}
          onForward={() => browserRef.current?.goForward()}
          onReload={() => browserRef.current?.reload()}
          onOpenHome={() => setShowHomeModal(true)}
          onOpenShields={() => setShowShieldsModal(true)}
          onOpenPortals={() => setShowPortalsModal(true)}
          onOpenDownloads={() => setShowDownloadsModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onToggleCinemaMode={() => setIsCinemaMode(!isCinemaMode)}
          onTriggerPip={() => handleTogglePip()}
          onToggleBackgroundAudio={handleToggleBackgroundAudio}
          onSkipNext={handleSkipNext}
        />
      )}

      {/* Live Sniffed Video Quick Action Banner */}
      {sniffedStream && !isCleanMode && !isPipActive && (
        <View style={[styles.sniffedBannerWrapper, { top: sniffedBannerTop }]}>
          <LiquidGlassContainer type="rounded" variant="card" style={styles.sniffedBannerCard}>
            <View style={styles.sniffedBannerInner}>
              <View style={styles.sniffedInfo}>
                <Film size={14} color="#f8fafc" />
                <View style={styles.sniffedTextCol}>
                  <Text style={styles.sniffedTitle} numberOfLines={1}>
                    {sniffedStream.title}
                  </Text>
                  <Text style={styles.sniffedSub}>Stream detected • 1080p</Text>
                </View>
              </View>

              <View style={styles.sniffedActions}>
                <TouchableOpacity
                  onPress={() => {
                    if (sniffedStream?.sourceUrl) {
                      dismissedStreamUrlsRef.current.add(sniffedStream.sourceUrl)
                    }
                    setActiveVideo(sniffedStream)
                    setAutoStartPip(true)
                    setIsCinemaMode(true)
                    setActiveTab('cinema')
                    setSniffedStream(null)
                  }}
                  style={styles.sniffedPipBtn}
                >
                  <PictureInPicture2 size={11} color="#06070a" />
                  <Text style={styles.sniffedPipText}>PiP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (sniffedStream?.sourceUrl) {
                      dismissedStreamUrlsRef.current.add(sniffedStream.sourceUrl)
                    }
                    setActiveVideo(sniffedStream)
                    setIsCinemaMode(true)
                    setActiveTab('cinema')
                    setSniffedStream(null)
                  }}
                  style={styles.sniffedCinemaBtn}
                >
                  <Tv size={11} color="#06070a" />
                  <Text style={styles.sniffedCinemaText}>Cinema</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (sniffedStream?.sourceUrl) {
                      dismissedStreamUrlsRef.current.add(sniffedStream.sourceUrl)
                    }
                    setActiveVideo(sniffedStream)
                    setBackgroundPlayEnabled(true)
                    backgroundAudio.setBackgroundPlayEnabled(true)
                    const title = sniffedStream.title || 'Web Video Stream'
                    const subtitle = currentUrl.replace(/^https?:\/\//, '').split('/')[0]
                    backgroundAudio.startKeepAlive(title, subtitle)
                    backgroundAudio.updatePlaybackState(true, title, subtitle)
                    setSniffedStream(null)
                  }}
                  style={styles.sniffedAudioBtn}
                >
                  <Headphones size={11} color="#06070a" />
                  <Text style={styles.sniffedAudioText}>Audio</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (sniffedStream?.sourceUrl) {
                      dismissedStreamUrlsRef.current.add(sniffedStream.sourceUrl)
                    }
                    setSniffedStream(null)
                  }}
                  style={styles.sniffedCloseBtn}
                >
                  <X size={12} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          </LiquidGlassContainer>
        </View>
      )}

      {/* Core Content Viewport - Full-bleed with calibrated top and bottom viewport safe margins */}
      <View style={styles.contentArea}>
        {activeTab === 'cinema' ? (
          /* SOUL BROWSER FULL GESTURE CINEMA PLAYER */
          <SoulVideoPlayer
            video={activeVideo}
            initialPositionMillis={videoPlaybackPositionMillis}
            autoStartPip={autoStartPip}
            onPlaybackStateChange={setIsCinemaPlaying}
            onClose={(pos) => {
              setAutoStartPip(false)
              setIsCinemaPlaying(false)
              if (typeof pos === 'number') setVideoPlaybackPositionMillis(pos)
              setIsCinemaMode(false)
              setActiveTab('browser')
            }}
            onTogglePip={(pos) => {
              setAutoStartPip(false)
              if (typeof pos === 'number') setVideoPlaybackPositionMillis(pos)
              setIsCinemaMode(false)
              setActiveTab('browser')
              setIsPipActive(true)
            }}
          />
        ) : (
          /* FULL-BLEED BROWSER WEBVIEW - TOP ISLAND FLOATS DIRECTLY OVER WEBPAGE */
          <View
            style={[
              styles.tabContent,
              {
                paddingTop: isPipActive ? 0 : insets.top,
                paddingBottom: isPipActive ? 0 : insets.bottom,
                backgroundColor: appColors.canvas,
              },
            ]}
          >
            <BrowserView
              ref={browserRef}
              url={activeBrowserUrl}
              isDark={isAppDark}
              themeMode={webThemeMode}
              isDesktopMode={isDesktopMode}
              shieldsEnabled={shieldsEnabled}
              style={[styles.webView, { backgroundColor: appColors.canvas }]}
              onLoadProgress={(progress) => {
                setLoadProgress(progress)
                setIsLoading(progress < 1)
              }}
              onLoadStart={() => {
                setIsLoading(true)
                setIsVideoPlayingOnPage(false)
              }}
              onLoadEnd={() => setIsLoading(false)}
              onBlockedAd={(count) => {
                if (typeof count === 'number') {
                  setBlockedAdsCount((prev) => Math.max(prev, count))
                } else {
                  setBlockedAdsCount((prev) => prev + 1)
                }
              }}
              onVideoStreamStatus={(isStreaming, mediaInfo) => {
                setIsVideoPlayingOnPage(Boolean(isStreaming))
                if (mediaInfo?.rect) {
                  videoRectRef.current = mediaInfo.rect
                } else if (!isStreaming) {
                  videoRectRef.current = undefined
                }
                if (mediaInfo?.title) {
                  setPageTitle(mediaInfo.title)
                }
                if (backgroundPlayEnabled) {
                  const title = isCinemaMode ? activeVideo.title : (mediaInfo?.title || pageTitle || 'Web Video Stream')
                  const subtitle = currentUrl.replace(/^https?:\/\//, '').split('/')[0]
                  backgroundAudio.updatePlaybackState(Boolean(isStreaming), title, subtitle).catch(() => {})
                }
              }}
              onMediaDetected={(media) => {
                if (!dismissedStreamUrlsRef.current.has(media.sourceUrl)) {
                  setSniffedStream(media)
                }
              }}
              onNavigationStateChange={(navState: any) => {
                setCanGoBack(navState.canGoBack)
                setCanGoForward(navState.canGoForward)
                if (navState.url && navState.url !== currentUrl) {
                  setCurrentUrl(navState.url)
                  const host = navState.url.replace(/^https?:\/\//, '').split('/')[0]
                  setActiveVideo((prev) => ({
                    ...prev,
                    title: `${host.toUpperCase()} Stream`,
                  }))
                }
                if (navState.title) {
                  setPageTitle(navState.title)
                }
              }}
              renderError={renderBrowserError}
            />
          </View>
        )}
      </View>

      {/* Floating Modals triggered from Top Bar or Bottom Dock */}
      <Modal
        visible={showPortalsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPortalsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <NativePortalsDirectory
            currentUrl={currentUrl}
            onSelectPortal={(url) => {
              handleNavigate(url)
              setShowPortalsModal(false)
            }}
            onClose={() => setShowPortalsModal(false)}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showDownloadsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDownloadsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <NativeDownloadManager
            currentUrl={currentUrl}
            hasStoragePermission={hasStoragePermission}
            onRequestStoragePermission={requestStoragePermission}
            onPlayVideo={(video) => {
              handlePlayDownloadedVideo(video)
              setShowDownloadsModal(false)
            }}
            onOpenPortals={() => {
              setShowDownloadsModal(false)
              setShowPortalsModal(true)
            }}
            onClose={() => setShowDownloadsModal(false)}
          />
        </SafeAreaView>
      </Modal>

      <NativeSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isDesktopMode={isDesktopMode}
        onToggleDesktopMode={() => setIsDesktopMode(!isDesktopMode)}
        hasStoragePermission={hasStoragePermission}
        onRequestStoragePermission={requestStoragePermission}
        shieldsEnabled={shieldsEnabled}
        onToggleShields={handleToggleShields}
        backgroundPlayEnabled={backgroundPlayEnabled}
        onToggleBackgroundPlay={() => setBackgroundPlayEnabled(!backgroundPlayEnabled)}
        autoPipEnabled={autoPipEnabled}
        onToggleAutoPip={() => setAutoPipEnabled(!autoPipEnabled)}
        onClearHistory={async () => {
          try {
            await AsyncStorage.removeItem(STORAGE_HISTORY_KEY)
            setRecentUrls([DEFAULT_URL, 'https://fmhy.net', 'https://vidsrc.to'])
            Alert.alert('History Cleared', 'Browsing history has been wiped.')
          } catch {}
        }}
      />

      {/* Brave Shields Control Dashboard Modal */}
      <BraveShieldsModal
        visible={showShieldsModal}
        onClose={() => setShowShieldsModal(false)}
        currentUrl={currentUrl}
        blockedCount={blockedAdsCount}
        shieldsEnabled={shieldsEnabled}
        onToggleShields={handleToggleShields}
      />

      {/* Standalone Home Hub Screen (Theme Switcher, Preloaded & Custom Links) */}
      <NativeHomeScreen
        visible={showHomeModal}
        onClose={() => setShowHomeModal(false)}
        onNavigate={handleNavigate}
        currentTheme={webThemeMode}
        onSelectTheme={(theme) => setWebThemeMode(theme)}
        recentUrls={recentUrls}
      />



      {/* Global Screen Off Mode (Audio Streaming / Battery Saver) Fullscreen Blackout */}
      {isScreenOff && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleGlobalScreenOffTouch}
          style={styles.globalScreenOffOverlay}
        >
          <Animated.View style={[styles.globalScreenOffHintCard, { opacity: screenOffHintOpacity }]}>
            <Moon size={32} color="#38bdf8" />
            <Text style={styles.globalScreenOffTitle}>Screen Off • Audio Streaming Active</Text>
            <Text style={styles.globalScreenOffSubtitle}>
              OLED black display saver active • Continuous streaming in background
            </Text>
            <View style={styles.globalScreenOffWakePill}>
              <Text style={styles.globalScreenOffWakeText}>Double-tap anywhere to wake screen</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <MainStreamNestApp />
      </AppErrorBoundary>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#06070c',
  },
  contentArea: {
    flex: 1,
    paddingTop: 0,
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#06070c',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: '#06070c',
  },
  progressBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 95,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.accent,
  },
  sniffedBannerWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 88,
  },
  sniffedBannerCard: {
    width: '100%',
  },
  sniffedBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sniffedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 8,
  },
  sniffedTextCol: {
    flex: 1,
  },
  sniffedTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  sniffedSub: {
    color: '#94a3b8',
    fontSize: 9.5,
    marginTop: 1,
  },
  sniffedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sniffedPipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  sniffedPipText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '600',
  },
  sniffedCinemaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  sniffedCinemaText: {
    color: '#06070a',
    fontSize: 10,
    fontWeight: '700',
  },
  sniffedAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  sniffedAudioText: {
    color: '#06070a',
    fontSize: 10,
    fontWeight: '700',
  },
  sniffedCloseBtn: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: THEME.colors.danger,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorDesc: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },
  errorBtn: {
    backgroundColor: THEME.colors.accent,
    padding: 12,
    borderRadius: THEME.radii.md,
    alignItems: 'center',
  },
  errorBtnText: {
    color: '#06070a',
    fontWeight: '800',
  },
  browserErrorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 10,
  },
  browserErrorCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: THEME.radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.hairlineMedium,
    alignItems: 'center',
    ...THEME.shadows.floating,
  },
  browserErrorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  browserErrorTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  browserErrorDesc: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  browserErrorSuggestions: {
    width: '100%',
    gap: 8,
    marginBottom: 14,
  },
  suggestionHeader: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    marginBottom: 2,
  },
  suggestionBtn: {
    backgroundColor: THEME.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: THEME.colors.hairlineLight,
    borderRadius: THEME.radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  suggestionBtnText: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  searchFallbackBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: THEME.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  searchFallbackText: {
    color: THEME.colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  retryBtn: {
    paddingVertical: 8,
  },
  retryBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  bottomDockContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 90,
    alignItems: 'center',
  },
  bottomDockPill: {
    width: '100%',
    borderRadius: 9999,
  },
  dockInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 48,
    paddingHorizontal: 8,
  },
  dockBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dockBtnDisabled: {
    opacity: 0.35,
  },
  dockCinemaBtn: {
    backgroundColor: '#38bdf8',
    width: 44,
    height: 34,
    borderRadius: 17,
  },
  dockBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  dockBadgeText: {
    color: '#06070a',
    fontSize: 8,
    fontWeight: '900',
  },
  globalScreenOffOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  globalScreenOffHintCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  globalScreenOffTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  globalScreenOffSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 260,
  },
  globalScreenOffWakePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 8,
  },
  globalScreenOffWakeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
})
