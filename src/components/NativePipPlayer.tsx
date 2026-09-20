import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native'
import { VideoStreamItem } from '../types'
import { THEME } from '../theme/tokens'
import { LiquidGlassContainer, LiquidGlassButton } from './LiquidGlass'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

interface NativePipPlayerProps {
  video: VideoStreamItem
  initialPositionMillis?: number
  onClose: (positionMillis?: number) => void
  onMaximize: (positionMillis?: number) => void
}

const PIP_SIZES = [
  { width: 200, height: 112 }, // Compact
  { width: 260, height: 146 }, // Standard
  { width: 320, height: 180 }, // Large
]

export function NativePipPlayer({
  video,
  initialPositionMillis = 0,
  onClose,
  onMaximize,
}: NativePipPlayerProps) {
  const insets = useSafeAreaInsets()
  const videoRef = useRef<Video>(null)

  // Sizing index (0 = Compact, 1 = Standard, 2 = Large)
  const [sizeIndex, setSizeIndex] = useState(1)
  const currentSize = PIP_SIZES[sizeIndex]

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTimeMs, setCurrentTimeMs] = useState(initialPositionMillis)
  const [durationMs, setDurationMs] = useState(180000)
  const [showControls, setShowControls] = useState(true)
  const [isStashed, setIsStashed] = useState<'left' | 'right' | null>(null)

  // Top and bottom boundaries for PiP window
  const topBound = Math.max(insets.top + 56, 96)
  const bottomBound = SCREEN_HEIGHT - currentSize.height - Math.max(insets.bottom, 16) - 76

  // Coordinates
  const pan = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH - currentSize.width - 14,
      y: bottomBound,
    })
  ).current

  const currentCoords = useRef({
    x: SCREEN_WIDTH - currentSize.width - 14,
    y: bottomBound,
  })

  useEffect(() => {
    const listenerId = pan.addListener((value) => {
      currentCoords.current = value
    })
    return () => {
      pan.removeListener(listenerId)
    }
  }, [pan])

  const controlsTimer = useRef<any>(null)
  const lastTapRef = useRef(0)

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => {
      setShowControls(false)
    }, 2800)
  }, [])

  useEffect(() => {
    resetControlsTimeout()
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current)
    }
  }, [resetControlsTimeout])

  // Compute magnetic corner snaps
  const snapToCorner = useCallback(
    (targetX: number, targetY: number, sizeW: number, sizeH: number) => {
      const topY = topBound
      const btmY = SCREEN_HEIGHT - sizeH - Math.max(insets.bottom, 16) - 76

      const corners = [
        { x: 14, y: topY }, // Top-Left
        { x: SCREEN_WIDTH - sizeW - 14, y: topY }, // Top-Right
        { x: 14, y: btmY }, // Bottom-Left
        { x: SCREEN_WIDTH - sizeW - 14, y: btmY }, // Bottom-Right
      ]

      // Check if dragged beyond screen edge for side-stash
      if (targetX < -40) {
        setIsStashed('left')
        Animated.spring(pan, {
          toValue: { x: -sizeW + 30, y: Math.max(topY, Math.min(targetY, btmY)) },
          useNativeDriver: false,
          friction: 7,
          tension: 45,
        }).start()
        return
      }

      if (targetX > SCREEN_WIDTH - sizeW + 40) {
        setIsStashed('right')
        Animated.spring(pan, {
          toValue: { x: SCREEN_WIDTH - 30, y: Math.max(topY, Math.min(targetY, btmY)) },
          useNativeDriver: false,
          friction: 7,
          tension: 45,
        }).start()
        return
      }

      setIsStashed(null)

      // Find closest corner
      let closest = corners[0]
      let minDist = Infinity
      for (const c of corners) {
        const dist = Math.hypot(targetX - c.x, targetY - c.y)
        if (dist < minDist) {
          minDist = dist
          closest = c
        }
      }

      Animated.spring(pan, {
        toValue: closest,
        useNativeDriver: false,
        friction: 7,
        tension: 45,
      }).start()
    },
    [pan, topBound, insets.bottom]
  )

  // PanResponder with magnetic release
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3
      },
      onPanResponderGrant: () => {
        pan.extractOffset()
        resetControlsTimeout()
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset()
        snapToCorner(
          currentCoords.current.x,
          currentCoords.current.y,
          currentSize.width,
          currentSize.height
        )
      },
    })
  ).current

  // Double tap to cycle sizes (Compact -> Standard -> Large)
  const handlePlayerTap = () => {
    const now = Date.now()
    if (now - lastTapRef.current < 280) {
      // Double tap detected!
      const nextIdx = (sizeIndex + 1) % PIP_SIZES.length
      setSizeIndex(nextIdx)
      const nextSize = PIP_SIZES[nextIdx]
      // Adjust position if overflowing right
      setTimeout(() => {
        snapToCorner(
          currentCoords.current.x,
          currentCoords.current.y,
          nextSize.width,
          nextSize.height
        )
      }, 50)
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
      resetControlsTimeout()
    }
  }

  // Restore from side-stash
  const handleRestoreFromStash = () => {
    setIsStashed(null)
    snapToCorner(
      isStashed === 'left' ? 14 : SCREEN_WIDTH - currentSize.width - 14,
      currentCoords.current.y,
      currentSize.width,
      currentSize.height
    )
  }

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying)
      setCurrentTimeMs(status.positionMillis)
      if (status.durationMillis) setDurationMs(status.durationMillis)
      setIsMuted(status.isMuted)
    }
  }

  const togglePlay = async () => {
    if (!videoRef.current) return
    if (isPlaying) {
      await videoRef.current.pauseAsync()
    } else {
      await videoRef.current.playAsync()
    }
    resetControlsTimeout()
  }

  const toggleMute = async () => {
    if (!videoRef.current) return
    await videoRef.current.setIsMutedAsync(!isMuted)
    setIsMuted(!isMuted)
    resetControlsTimeout()
  }

  const skipSeconds = async (seconds: number) => {
    if (!videoRef.current) return
    const target = Math.max(0, Math.min(currentTimeMs + seconds * 1000, durationMs))
    await videoRef.current.setPositionAsync(target)
    resetControlsTimeout()
  }

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000)
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.pipContainer,
        {
          width: currentSize.width,
          height: currentSize.height,
          transform: pan.getTranslateTransform(),
        },
      ]}
    >
      {/* Specular Top Rim Reflection */}
      <View pointerEvents="none" style={styles.specularTopRim} />

      {/* Hardware-Accelerated Video Stream */}
      <Video
        ref={videoRef}
        source={{ uri: video.sourceUrl }}
        positionMillis={initialPositionMillis}
        rate={1.0}
        volume={1.0}
        isMuted={isMuted}
        resizeMode={ResizeMode.COVER}
        shouldPlay={isPlaying}
        isLooping
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        style={styles.video}
      />

      {/* Stashed Peeking Tab Indicator */}
      {isStashed && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleRestoreFromStash}
          style={[
            styles.stashTab,
            isStashed === 'left' ? styles.stashTabLeft : styles.stashTabRight,
          ]}
        >
          {isStashed === 'left' ? (
            <ChevronRight size={18} color="#38bdf8" />
          ) : (
            <ChevronLeft size={18} color="#38bdf8" />
          )}
        </TouchableOpacity>
      )}

      {/* Controls Overlay Touch Surface */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePlayerTap}
        style={styles.touchOverlay}
      >
        {showControls && !isStashed && (
          <View style={styles.controlsLayer}>
            {/* Top Bar: Live indicator, Title & Actions */}
            <View style={styles.topBar}>
              <View style={styles.titleRow}>
                <View style={styles.liveIndicator} />
                <Text style={styles.titleText} numberOfLines={1}>
                  {video.title}
                </Text>
              </View>

              <View style={styles.topButtons}>
                <TouchableOpacity
                  onPress={() => onMaximize(currentTimeMs)}
                  style={styles.circleActionBtn}
                >
                  <Maximize2 size={11} color="#f8fafc" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onClose(currentTimeMs)}
                  style={[styles.circleActionBtn, styles.closeActionBtn]}
                >
                  <X size={12} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Center Controls: Play / Pause & 10s Skips */}
            <View style={styles.centerControls}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => skipSeconds(-10)}
                style={styles.skipBtn}
              >
                <RotateCcw size={13} color="#f8fafc" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={togglePlay}
                style={styles.playBtn}
              >
                {isPlaying ? (
                  <Pause size={15} color="#06070a" />
                ) : (
                  <Play size={15} color="#06070a" style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => skipSeconds(10)}
                style={styles.skipBtn}
              >
                <RotateCw size={13} color="#f8fafc" />
              </TouchableOpacity>
            </View>

            {/* Bottom Bar: Micro Scrubber & Mute */}
            <View style={styles.bottomBar}>
              <Text style={styles.timeText}>{formatTime(currentTimeMs)}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, (currentTimeMs / (durationMs || 1)) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={toggleMute}
                style={styles.volumeBtn}
              >
                {isMuted ? (
                  <VolumeX size={12} color="#94a3b8" />
                ) : (
                  <Volume2 size={12} color="#38bdf8" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  pipContainer: {
    position: 'absolute',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#06070c',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 14,
  },
  specularTopRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    zIndex: 10,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  touchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  controlsLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 7, 12, 0.55)',
    justifyContent: 'space-between',
    padding: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  liveIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
    marginRight: 5,
  },
  titleText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '700',
  },
  topButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  circleActionBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  skipBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 8.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },
  volumeBtn: {
    padding: 3,
  },
  stashTab: {
    position: 'absolute',
    top: '30%',
    width: 26,
    height: 38,
    backgroundColor: 'rgba(15, 20, 32, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  stashTabLeft: {
    right: 0,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  stashTabRight: {
    left: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
})
