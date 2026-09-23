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
    console.error('StreamNest Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorTitle}>StreamNest App Notice</Text>
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
          'System media access not granted. Offline downloads will be saved directly into StreamNest private app sandbox.'
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
  // Auto-enter PiP on swipe-home is strictly locked unless a video is actively playing.
  useEffect(() => {
    setSystemPipVideoPlaybackState(isAnyVideoPlaying, autoPipEnabled).catch(() => {})
  }, [isAnyVideoPlaying, autoPipEnabled])

  const handleTogglePip = async (posMillis?: number) => {
    if (!isAnyVideoPlaying && !sniffedStream && !isCinemaMode) {
      Alert.alert(
        'No Active Video Stream',
        'Picture-in-Picture mode activates when a video is actively playing on the page or in cinema mode.'
      )
      return
    }
    if (typeof posMillis === 'number') {
      setVideoPlaybackPositionMillis(posMillis)
    }
    if (sniffedStream) {
      setActiveVideo(sniffedStream)
      setSniffedStream(null)
    }
    const entered = await enterSystemPictureInPicture()
    if (!entered) {
      if (!isCinemaMode) {
        setAutoStartPip(true)
        setIsCinemaMode(true)
        setActiveTab('cinema')
      } else {
        setIsPipActive((prev) => !prev)
      }
    }
  }

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
    if (backgroundPlayEnabled && isAnyVideoPlaying) {
      const title = isCinemaMode ? activeVideo.title : (pageTitle || 'Web Video Stream')
      backgroundAudio.startKeepAlive(title, currentUrl)
    } else {
      backgroundAudio.stopKeepAlive()
    }
  }, [backgroundPlayEnabled, isAnyVideoPlaying, isCinemaMode, activeVideo.title, pageTitle, currentUrl])

  return (
    <View style={[styles.rootContainer, { backgroundColor: appColors.canvas }]}>
      <StatusBar
        style={isAppDark ? 'light' : 'dark'}
        backgroundColor={appColors.canvas}
      />

      {/* Top Browser Liquid Glass Navbar - Apple Frosted Glass with Integrated Progress Rim */}
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
        isHidden={isCleanMode}
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
      />

      {/* Live Sniffed Video Quick Action Banner */}
      {sniffedStream && !isCleanMode && (
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
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
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
              onVideoStreamStatus={(isStreaming) => {
                setIsVideoPlayingOnPage(Boolean(isStreaming))
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
