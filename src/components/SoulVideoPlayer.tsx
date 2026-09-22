import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native'
import {
  VideoView,
  useVideoPlayer,
  isPictureInPictureSupported,
  VideoContentFit,
} from 'expo-video'
import * as ScreenOrientation from 'expo-screen-orientation'
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  PictureInPicture2,
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
  Sun,
  X,
  Repeat,
  Gauge,
  Moon,
  Smartphone,
  Compass,
} from 'lucide-react-native'
import { VideoStreamItem } from '../types'
import { THEME } from '../theme/tokens'
import { LiquidGlassContainer, LiquidGlassButton } from './LiquidGlass'

interface SoulVideoPlayerProps {
  video: VideoStreamItem
  initialPositionMillis?: number
  autoStartPip?: boolean
  onClose: (currentPositionMillis?: number) => void
  onTogglePip: (currentPositionMillis?: number) => void
  onPlaybackStateChange?: (isPlaying: boolean) => void
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
const RESIZE_MODES: VideoContentFit[] = ['contain', 'cover', 'fill']

export function SoulVideoPlayer({
  video,
  initialPositionMillis = 0,
  autoStartPip = false,
  onClose,
  onTogglePip,
  onPlaybackStateChange,
}: SoulVideoPlayerProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const videoViewRef = useRef<VideoView>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [positionMillis, setPositionMillis] = useState(initialPositionMillis || 0)
  const [durationMillis, setDurationMillis] = useState(360000)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [resizeModeIndex, setResizeModeIndex] = useState(0)
  const [isLooping, setIsLooping] = useState(false)

  // Orientation & VLC Mode state
  const [isFullscreenLandscape, setIsFullscreenLandscape] = useState(false)
  const [orientationMode, setOrientationMode] = useState<'auto' | 'landscape' | 'portrait'>('auto')

  // Screen Off / Audio Streaming Mode state
  const [isScreenOff, setIsScreenOff] = useState(false)
  const screenOffHintOpacity = useRef(new Animated.Value(1)).current
  const screenOffTimeoutRef = useRef<any>(null)

  // HUD & Gesture states
  const [showControls, setShowControls] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [doubleTapRipple, setDoubleTapRipple] = useState<'left' | 'right' | null>(null)

  // On-Screen Display HUD indicator states (Volume / Brightness / Seek)
  const [osdMode, setOsdMode] = useState<'none' | 'volume' | 'brightness' | 'seek'>('none')
  const [osdValue, setOsdValue] = useState(50)
  const [seekDeltaSec, setSeekDeltaSec] = useState(0)
  const [seekTargetMs, setSeekTargetMs] = useState(0)

  // Hardware value trackers
  const volumeRef = useRef(100)
  const brightnessRef = useRef(80)
  const lastTapTimeRef = useRef(0)
  const controlsTimeoutRef = useRef<any>(null)
  const gestureStartCoordsRef = useRef({ x: 0, y: 0 })
  const gestureTypeRef = useRef<'none' | 'volume' | 'brightness' | 'seek'>('none')
  const gestureInitialValueRef = useRef(0)
  const trackWidthRef = useRef(0)

  // 1. Initialize modern Expo Video Player with background playback and notification controls
  const player = useVideoPlayer(video.sourceUrl, (p) => {
    p.loop = isLooping
    p.staysActiveInBackground = true
    p.showNowPlayingNotification = true
    p.timeUpdateEventInterval = 0.25
    p.playbackRate = playbackSpeed
    p.volume = 1.0
    p.muted = isMuted
    p.play()
  })

  // Synchronize player events
  useEffect(() => {
    if (!player) return

    // Set initial position if restoring from PiP or history
    if (initialPositionMillis > 0) {
      player.currentTime = initialPositionMillis / 1000
    }

    if (player.playing) {
      onPlaybackStateChange?.(true)
    }

    const playingSub = player.addListener('playingChange', (event) => {
      setIsPlaying(event.isPlaying)
      onPlaybackStateChange?.(event.isPlaying)
    })

    const timeSub = player.addListener('timeUpdate', (event) => {
      const pos = Math.round(event.currentTime * 1000)
      setPositionMillis(pos)
      if (player.duration) {
        setDurationMillis(Math.round(player.duration * 1000))
      }
    })

    const statusSub = player.addListener('statusChange', (event) => {
      if (event.status === 'readyToPlay' && initialPositionMillis > 0) {
        player.currentTime = initialPositionMillis / 1000
      }
    })

    return () => {
      playingSub.remove()
      timeSub.remove()
      statusSub.remove()
      onPlaybackStateChange?.(false)
    }
  }, [player, initialPositionMillis, onPlaybackStateChange])

  // Auto-initiate System PiP when requested from Dynamic Island
  useEffect(() => {
    if (autoStartPip && videoViewRef.current) {
      const timer = setTimeout(() => {
        handleTogglePipMode()
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [autoStartPip])

  // 2. VLC-Style Orientation Listener: Auto-rotates player with device tilt
  useEffect(() => {
    // By default, allow free sensor rotation inside cinema mode (like VLC)
    ScreenOrientation.unlockAsync().catch(() => {})

    const orientationSub = ScreenOrientation.addOrientationChangeListener((event) => {
      const o = event.orientationInfo.orientation
      if (
        o === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        o === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
      ) {
        setIsFullscreenLandscape(true)
      } else if (
        o === ScreenOrientation.Orientation.PORTRAIT_UP ||
        o === ScreenOrientation.Orientation.PORTRAIT_DOWN
      ) {
        setIsFullscreenLandscape(false)
      }
    })

    return () => {
      ScreenOrientation.removeOrientationChangeListener(orientationSub)
      // When leaving cinema player, always lock back to portrait cleanly
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {})
    }
  }, [])

  // 3. Fullscreen Button Rotation: Rotates to landscape regardless of system rotation lock
  const toggleFullscreenRotation = async () => {
    try {
      if (isFullscreenLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        setIsFullscreenLandscape(false)
        setOrientationMode('portrait')
      } else {
        // Forces screen to landscape even if device auto-rotate is locked to portrait!
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
        setIsFullscreenLandscape(true)
        setOrientationMode('landscape')
      }
    } catch (err) {
      console.warn('Orientation lock error:', err)
    }
    resetControlsTimer()
  }

  // Cycle VLC Orientation modes (Auto Sensor -> Locked Landscape -> Locked Portrait)
  const cycleOrientationMode = async () => {
    try {
      if (orientationMode === 'auto') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
        setOrientationMode('landscape')
        setIsFullscreenLandscape(true)
      } else if (orientationMode === 'landscape') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        setOrientationMode('portrait')
        setIsFullscreenLandscape(false)
      } else {
        await ScreenOrientation.unlockAsync()
        setOrientationMode('auto')
      }
    } catch (e) {
      console.warn('VLC orientation mode error:', e)
    }
    resetControlsTimer()
  }

  // 4. Native PiP Trigger (YouTube Premium Style)
  const handleTogglePipMode = async () => {
    const currentMs = Math.round((player?.currentTime || 0) * 1000)
    try {
      if (isPictureInPictureSupported()) {
        await videoViewRef.current?.startPictureInPicture()
      } else {
        // Smooth fallback to in-app magnetic PiP
        onTogglePip(currentMs)
      }
    } catch (err) {
      console.warn('System PiP activation error, falling back to in-app PiP:', err)
      onTogglePip(currentMs)
    }
  }

  // 5. Screen Off (Audio Streaming / Battery Saver) Mode handlers
  const activateScreenOffMode = () => {
    setIsScreenOff(true)
    showScreenOffHintBriefly()
  }

  const showScreenOffHintBriefly = () => {
    screenOffHintOpacity.setValue(1)
    if (screenOffTimeoutRef.current) clearTimeout(screenOffTimeoutRef.current)
    screenOffTimeoutRef.current = setTimeout(() => {
      Animated.timing(screenOffHintOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start()
    }, 2800)
  }

  const handleScreenOffTouch = () => {
    const now = Date.now()
    if (now - lastTapTimeRef.current < 350) {
      // Double tap wakes screen
      setIsScreenOff(false)
      lastTapTimeRef.current = 0
      resetControlsTimer()
    } else {
      // Single tap shows dim hint
      lastTapTimeRef.current = now
      showScreenOffHintBriefly()
    }
  }

  // Auto-hide controls timer
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
      setOsdMode('none')
    }, 3800)
  }, [])

  useEffect(() => {
    resetControlsTimer()
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      if (screenOffTimeoutRef.current) clearTimeout(screenOffTimeoutRef.current)
    }
  }, [resetControlsTimer])

  // Play / Pause toggle
  const togglePlayPause = () => {
    if (!player) return
    if (isPlaying) {
      player.pause()
    } else {
      player.play()
    }
    resetControlsTimer()
  }

  // Skip 10 seconds
  const skipForward = () => {
    if (!player) return
    player.seekBy(10)
    resetControlsTimer()
  }

  const skipBackward = () => {
    if (!player) return
    player.seekBy(-10)
    resetControlsTimer()
  }

  // Cycle speed presets
  const cycleSpeed = () => {
    if (!player) return
    const nextIdx = (PLAYBACK_SPEEDS.indexOf(playbackSpeed) + 1) % PLAYBACK_SPEEDS.length
    const nextSpeed = PLAYBACK_SPEEDS[nextIdx]
    setPlaybackSpeed(nextSpeed)
    player.playbackRate = nextSpeed
    resetControlsTimer()
  }

  // Cycle aspect ratio / resize mode
  const cycleResizeMode = () => {
    setResizeModeIndex((prev) => (prev + 1) % RESIZE_MODES.length)
    resetControlsTimer()
  }

  const currentResizeMode = RESIZE_MODES[resizeModeIndex]
  const resizeModeLabel =
    currentResizeMode === 'contain'
      ? 'Fit'
      : currentResizeMode === 'cover'
      ? 'Fill'
      : 'Stretch'

  // Progress Bar Seek
  const handleSeekFromBar = (event: any) => {
    if (!player || trackWidthRef.current <= 0 || durationMillis <= 0) return
    const locationX = event.nativeEvent.locationX
    const ratio = Math.max(0, Math.min(locationX / trackWidthRef.current, 1))
    const targetMs = Math.round(ratio * durationMillis)
    player.currentTime = targetMs / 1000
    setPositionMillis(targetMs)
    resetControlsTimer()
  }

  // Multi-gesture pan responder: Volume, brightness & scrub
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10
      },
      onPanResponderGrant: (evt) => {
        const { locationX } = evt.nativeEvent
        gestureStartCoordsRef.current = { x: locationX, y: evt.nativeEvent.locationY }
        gestureTypeRef.current = 'none'

        // Handle double-tap detection for ±10s skip
        const now = Date.now()
        const DOUBLE_TAP_DELAY = 300
        if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
          if (locationX < windowWidth * 0.4) {
            setDoubleTapRipple('left')
            skipBackward()
            setTimeout(() => setDoubleTapRipple(null), 600)
          } else if (locationX > windowWidth * 0.6) {
            setDoubleTapRipple('right')
            skipForward()
            setTimeout(() => setDoubleTapRipple(null), 600)
          } else {
            togglePlayPause()
          }
          lastTapTimeRef.current = 0
          return
        }
        lastTapTimeRef.current = now

        if (showControls) {
          resetControlsTimer()
        } else {
          setShowControls(true)
          resetControlsTimer()
        }
      },
      onPanResponderMove: (_, gestureState) => {
        if (isLocked) return

        const { dx, dy } = gestureState
        const startX = gestureStartCoordsRef.current.x

        if (gestureTypeRef.current === 'none') {
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 15) {
            gestureTypeRef.current = 'seek'
            gestureInitialValueRef.current = positionMillis
            setOsdMode('seek')
          } else if (Math.abs(dy) > 15) {
            if (startX < windowWidth * 0.5) {
              gestureTypeRef.current = 'brightness'
              gestureInitialValueRef.current = brightnessRef.current
              setOsdMode('brightness')
            } else {
              gestureTypeRef.current = 'volume'
              gestureInitialValueRef.current = volumeRef.current
              setOsdMode('volume')
            }
          }
        }

        if (gestureTypeRef.current === 'brightness') {
          const delta = Math.round((-dy / (windowHeight * 0.4)) * 100)
          const newBrightness = Math.max(5, Math.min(100, gestureInitialValueRef.current + delta))
          brightnessRef.current = newBrightness
          setOsdValue(newBrightness)
        } else if (gestureTypeRef.current === 'volume') {
          const delta = Math.round((-dy / (windowHeight * 0.4)) * 100)
          const newVol = Math.max(0, Math.min(100, gestureInitialValueRef.current + delta))
          volumeRef.current = newVol
          setOsdValue(newVol)
          if (player) {
            player.volume = newVol / 100
          }
          setIsMuted(newVol === 0)
        } else if (gestureTypeRef.current === 'seek') {
          const deltaSec = Math.round((dx / (windowWidth * 0.6)) * 90)
          const target = Math.max(0, Math.min(durationMillis, gestureInitialValueRef.current + deltaSec * 1000))
          setSeekDeltaSec(deltaSec)
          setSeekTargetMs(target)
        }
      },
      onPanResponderRelease: () => {
        if (gestureTypeRef.current === 'seek' && player) {
          player.currentTime = seekTargetMs / 1000
          setPositionMillis(seekTargetMs)
        }
        gestureTypeRef.current = 'none'
        setTimeout(() => {
          setOsdMode('none')
        }, 1200)
        resetControlsTimer()
      },
    })
  ).current

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000)
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // Darkness opacity for brightness simulation
  const darknessOpacity = 1 - (osdMode === 'brightness' ? osdValue : brightnessRef.current) / 100

  return (
    <View style={styles.container}>
      {/* Gesture Capture & Video Surface */}
      <View style={StyleSheet.absoluteFillObject} {...panResponder.panHandlers}>
        <VideoView
          ref={videoViewRef}
          player={player}
          contentFit={currentResizeMode}
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={true}
          startsPictureInPictureAutomatically={true}
          style={styles.videoSurface}
        />

        {/* Dynamic Brightness Shading Overlay */}
        <View
          pointerEvents="none"
          style={[styles.brightnessShade, { opacity: darknessOpacity * 0.75 }]}
        />

        {/* Double-Tap Skip Ripple Visuals */}
        {doubleTapRipple === 'left' && (
          <View pointerEvents="none" style={[styles.rippleOverlay, styles.rippleLeft]}>
            <RotateCcw size={26} color="#fff" />
            <Text style={styles.rippleText}>-10s</Text>
          </View>
        )}
        {doubleTapRipple === 'right' && (
          <View pointerEvents="none" style={[styles.rippleOverlay, styles.rippleRight]}>
            <RotateCw size={26} color="#fff" />
            <Text style={styles.rippleText}>+10s</Text>
          </View>
        )}

        {/* On-Screen Display (OSD) HUD Meters */}
        {osdMode === 'brightness' && (
          <LiquidGlassContainer type="pill" variant="floating" style={styles.osdCard}>
            <Sun size={16} color={THEME.colors.warning} />
            <View style={styles.osdBarWrapper}>
              <View style={[styles.osdBarFill, { width: `${osdValue}%`, backgroundColor: THEME.colors.warning }]} />
            </View>
            <Text style={styles.osdText}>{osdValue}%</Text>
          </LiquidGlassContainer>
        )}

        {osdMode === 'volume' && (
          <LiquidGlassContainer type="pill" variant="floating" style={styles.osdCard}>
            <Volume2 size={16} color={THEME.colors.accent} />
            <View style={styles.osdBarWrapper}>
              <View style={[styles.osdBarFill, { width: `${osdValue}%`, backgroundColor: THEME.colors.accent }]} />
            </View>
            <Text style={styles.osdText}>{osdValue}%</Text>
          </LiquidGlassContainer>
        )}

        {osdMode === 'seek' && (
          <LiquidGlassContainer type="pill" variant="floating" style={styles.osdSeekCard}>
            <Text style={styles.osdSeekDelta}>
              {seekDeltaSec >= 0 ? `+${seekDeltaSec}s` : `${seekDeltaSec}s`}
            </Text>
            <Text style={styles.osdSeekTarget}>
              {formatTime(seekTargetMs)} / {formatTime(durationMillis)}
            </Text>
          </LiquidGlassContainer>
        )}
      </View>

      {/* Screen Lock Toggle Button (Liquid Glass Circle) */}
      <LiquidGlassButton
        type="circle"
        size={38}
        onPress={() => {
          setIsLocked(!isLocked)
          resetControlsTimer()
        }}
        active={isLocked}
        activeColor={THEME.colors.danger}
        style={[styles.lockFab, isLocked && styles.lockFabActive]}
        accessibilityLabel="Lock Screen"
      >
        {isLocked ? (
          <Lock size={15} color={THEME.colors.danger} />
        ) : (
          <Unlock size={15} color={THEME.colors.textPrimary} />
        )}
      </LiquidGlassButton>

      {/* Controls Overlay (Hidden when locked or auto-faded) */}
      {showControls && !isLocked && (
        <View pointerEvents="box-none" style={styles.controlsLayer}>
          {/* Top Liquid Glass Pill Header */}
          <LiquidGlassContainer type="pill" variant="floating" style={styles.topBezelInner}>
            <View style={styles.titleCol}>
              <Text style={styles.videoTitle} numberOfLines={1}>
                {video.title}
              </Text>
              <View style={styles.tagRow}>
                <View style={styles.qualityTag}>
                  <Text style={styles.qualityTagText}>{video.quality || '1080p Ultra'}</Text>
                </View>
                <Text style={styles.videoSubtitle}>Soul Cinema Engine</Text>
              </View>
            </View>

            <View style={styles.topRightActions}>
              {/* VLC Orientation Mode Cycle Pill */}
              <LiquidGlassButton
                type="pill"
                size={28}
                onPress={cycleOrientationMode}
                style={styles.topActionPill}
              >
                <Compass size={11} color={THEME.colors.accent} style={{ marginRight: 4 }} />
                <Text style={styles.topActionText}>
                  {orientationMode === 'auto' ? 'VLC Auto' : orientationMode === 'landscape' ? 'Land' : 'Port'}
                </Text>
              </LiquidGlassButton>

              {/* Resize Mode Pill */}
              <LiquidGlassButton
                type="pill"
                size={28}
                onPress={cycleResizeMode}
                style={styles.topActionPill}
              >
                <Maximize2 size={11} color={THEME.colors.textPrimary} style={{ marginRight: 4 }} />
                <Text style={styles.topActionText}>{resizeModeLabel}</Text>
              </LiquidGlassButton>

              {/* Screen Off Mode (Audio Streaming / Battery Saver) Icon Button */}
              <LiquidGlassButton
                type="circle"
                size={28}
                onPress={activateScreenOffMode}
                accessibilityLabel="Screen Off Mode"
              >
                <Moon size={13} color="#38bdf8" />
              </LiquidGlassButton>

              {/* Native YouTube Premium-Style PiP Button */}
              <LiquidGlassButton
                type="circle"
                size={28}
                onPress={handleTogglePipMode}
                accessibilityLabel="Picture in Picture"
              >
                <PictureInPicture2 size={13} color={THEME.colors.textPrimary} />
              </LiquidGlassButton>

              {/* Close Button */}
              <LiquidGlassButton
                type="circle"
                size={28}
                onPress={() => {
                  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {})
                  onClose(Math.round((player?.currentTime || 0) * 1000))
                }}
                accessibilityLabel="Close Player"
              >
                <X size={14} color={THEME.colors.textPrimary} />
              </LiquidGlassButton>
            </View>
          </LiquidGlassContainer>

          {/* Center Play/Pause Disc & Skip Triggers */}
          <View pointerEvents="box-none" style={styles.centerControlsRow}>
            <LiquidGlassButton
              type="circle"
              size={46}
              onPress={skipBackward}
              accessibilityLabel="Rewind 10 Seconds"
            >
              <RotateCcw size={18} color="#fff" />
            </LiquidGlassButton>

            {/* Apple-style Liquid Glass Center Disc */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={togglePlayPause}
              style={styles.playPauseDisc}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              <View style={styles.playPauseDiscInner}>
                {isPlaying ? (
                  <Pause size={24} color="#06070a" />
                ) : (
                  <Play size={24} color="#06070a" style={{ marginLeft: 3 }} />
                )}
              </View>
            </TouchableOpacity>

            <LiquidGlassButton
              type="circle"
              size={46}
              onPress={skipForward}
              accessibilityLabel="Forward 10 Seconds"
            >
              <RotateCw size={18} color="#fff" />
            </LiquidGlassButton>
          </View>

          {/* Bottom Liquid Glass Scrubber & Settings Deck */}
          <LiquidGlassContainer type="rounded" variant="floating" style={styles.bottomBezelInner}>
            {/* Scrubber Progress Bar */}
            <View style={styles.progressRow}>
              <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
              <TouchableOpacity
                activeOpacity={1}
                onLayout={(e) => {
                  trackWidthRef.current = e.nativeEvent.layout.width
                }}
                onPress={handleSeekFromBar}
                style={styles.progressBarTrack}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(positionMillis / Math.max(1, durationMillis)) * 100}%` },
                  ]}
                />
                <View
                  style={[
                    styles.progressThumb,
                    { left: `${Math.max(0, Math.min(98, (positionMillis / Math.max(1, durationMillis)) * 100))}%` },
                  ]}
                />
              </TouchableOpacity>
              <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
            </View>

            {/* Quick Action Footer Controls */}
            <View style={styles.footerRow}>
              {/* Speed Preset Pill */}
              <LiquidGlassButton
                type="pill"
                size={30}
                onPress={cycleSpeed}
              >
                <Gauge size={11} color={THEME.colors.accent} style={{ marginRight: 4 }} />
                <Text style={styles.footerPillText}>{playbackSpeed}x</Text>
              </LiquidGlassButton>

              {/* Repeat Loop Pill */}
              <LiquidGlassButton
                type="pill"
                size={30}
                active={isLooping}
                activeColor={THEME.colors.success}
                onPress={() => {
                  const nextLoop = !isLooping
                  setIsLooping(nextLoop)
                  if (player) player.loop = nextLoop
                }}
              >
                <Repeat
                  size={11}
                  color={isLooping ? THEME.colors.success : THEME.colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.footerPillText, isLooping && { color: THEME.colors.success }]}>
                  {isLooping ? 'Repeat On' : 'Repeat'}
                </Text>
              </LiquidGlassButton>

              {/* Sound / Mute Pill */}
              <LiquidGlassButton
                type="pill"
                size={30}
                active={isMuted}
                activeColor={THEME.colors.danger}
                onPress={() => {
                  const nextMute = !isMuted
                  setIsMuted(nextMute)
                  if (player) player.muted = nextMute
                }}
              >
                {isMuted ? (
                  <VolumeX size={11} color={THEME.colors.danger} style={{ marginRight: 4 }} />
                ) : (
                  <Volume2 size={11} color={THEME.colors.textPrimary} style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.footerPillText, isMuted && { color: THEME.colors.danger }]}>
                  {isMuted ? 'Muted' : 'Sound On'}
                </Text>
              </LiquidGlassButton>

              {/* Fullscreen Landscape Rotation Button (irrespective of phone auto-rotate lock) */}
              <LiquidGlassButton
                type="pill"
                size={30}
                active={isFullscreenLandscape}
                activeColor={THEME.colors.accent}
                onPress={toggleFullscreenRotation}
              >
                {isFullscreenLandscape ? (
                  <Minimize2 size={11} color={THEME.colors.accent} style={{ marginRight: 4 }} />
                ) : (
                  <Maximize2 size={11} color={THEME.colors.textPrimary} style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.footerPillText, isFullscreenLandscape && { color: THEME.colors.accent }]}>
                  {isFullscreenLandscape ? 'Portrait' : 'Fullscreen'}
                </Text>
              </LiquidGlassButton>
            </View>
          </LiquidGlassContainer>
        </View>
      )}

      {/* Screen Off Mode (Audio Streaming / Battery Saver) Fullscreen Blackout Overlay */}
      {isScreenOff && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleScreenOffTouch}
          style={styles.screenOffOverlay}
        >
          <Animated.View style={[styles.screenOffHintCard, { opacity: screenOffHintOpacity }]}>
            <Moon size={32} color="#38bdf8" />
            <Text style={styles.screenOffTitle}>Screen Off • Audio Streaming Active</Text>
            <Text style={styles.screenOffSubtitle}>
              OLED black display saver active • Video continues in background
            </Text>
            <View style={styles.screenOffWakePill}>
              <Text style={styles.screenOffWakeText}>Double-tap anywhere to wake screen</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoSurface: {
    width: '100%',
    height: '100%',
  },
  brightnessShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  rippleOverlay: {
    position: 'absolute',
    top: '40%',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  rippleLeft: {
    left: '12%',
  },
  rippleRight: {
    right: '12%',
  },
  rippleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
    fontFamily: THEME.typography.monoFamily,
  },
  osdCard: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  osdBarWrapper: {
    width: 100,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  osdBarFill: {
    height: '100%',
  },
  osdText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: THEME.typography.monoFamily,
    fontWeight: '700',
  },
  osdSeekCard: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  osdSeekDelta: {
    color: THEME.colors.accent,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: THEME.typography.monoFamily,
  },
  osdSeekTarget: {
    color: '#cbd5e1',
    fontSize: 11,
    fontFamily: THEME.typography.monoFamily,
    marginTop: 2,
  },
  lockFab: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'ios' ? 56 : 36,
    zIndex: 105,
  },
  lockFabActive: {
    borderColor: THEME.colors.danger,
  },
  controlsLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 28,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    zIndex: 100,
  },
  topBezelInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: '100%',
  },
  titleCol: {
    flex: 1,
    marginRight: 10,
  },
  videoTitle: {
    color: THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  qualityTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  qualityTagText: {
    color: THEME.colors.accent,
    fontSize: 8,
    fontFamily: THEME.typography.monoFamily,
    fontWeight: '800',
  },
  videoSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 9,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topActionText: {
    color: THEME.colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  centerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  playPauseDisc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  playPauseDiscInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBezelInner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    gap: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontFamily: THEME.typography.monoFamily,
    letterSpacing: 0.2,
  },
  progressBarTrack: {
    flex: 1,
    height: 16,
    justifyContent: 'center',
    position: 'relative',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: THEME.colors.accent,
    borderRadius: 1.5,
  },
  progressThumb: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    top: 3,
    shadowColor: THEME.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  footerPillText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  screenOffOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  screenOffHintCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  screenOffTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  screenOffSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 260,
  },
  screenOffWakePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 8,
  },
  screenOffWakeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
})
