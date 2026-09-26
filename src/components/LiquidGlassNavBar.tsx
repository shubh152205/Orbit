import React, { useState, useRef, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Animated,
  Keyboard,
  LayoutAnimation,
  UIManager,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Shield,
  ShieldCheck,
  Search,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Lock,
  Home,
  Tv,
  PictureInPicture2,
  Sliders,
  Compass,
  Download,
  Check,
  Eye,
  EyeOff,
  Headphones,
  SkipForward,
} from 'lucide-react-native'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export interface LiquidGlassNavBarProps {
  currentUrl: string
  pageTitle?: string
  isLoading?: boolean
  loadProgress?: number
  canGoBack?: boolean
  canGoForward?: boolean
  isDark?: boolean
  blockedAdsCount?: number
  shieldsEnabled?: boolean
  isVideoStreaming?: boolean
  isCinemaMode?: boolean
  isDesktopMode?: boolean
  isPipActive?: boolean
  isHidden?: boolean
  isBackgroundAudioEnabled?: boolean
  onToggleHide?: () => void
  onNavigate: (url: string) => void
  onBack?: () => void
  onForward?: () => void
  onReload?: () => void
  onOpenHome?: () => void
  onOpenShields?: () => void
  onOpenPortals?: () => void
  onOpenDownloads?: () => void
  onOpenSettings?: () => void
  onToggleCinemaMode?: () => void
  onTriggerPip?: () => void
  onToggleBackgroundAudio?: () => void
  onSkipNext?: () => void
}

/**
 * LiquidGlassNavBar
 * Production Hardware-Accelerated Apple Liquid Glass Navigation Bar.
 * 
 * Built with:
 * - Real native blur via `expo-blur` (systemUltraThinMaterial)
 * - Physical glass acoustics: translucent perimeter rim, specular sheen, and soft elevation
 * - Safe area inset positioning floating absolute over the web canvas
 * - Responsive URL Omnibox, search input, quick portal shortcuts, and load progress line
 */
export function LiquidGlassNavBar({
  currentUrl,
  pageTitle,
  isLoading = false,
  loadProgress = 0,
  canGoBack = false,
  canGoForward = false,
  isDark = true,
  blockedAdsCount = 0,
  shieldsEnabled = true,
  isVideoStreaming = false,
  isCinemaMode = false,
  isDesktopMode = false,
  isPipActive = false,
  isHidden,
  onToggleHide,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onOpenHome,
  onOpenShields,
  onOpenPortals,
  onOpenDownloads,
  onOpenSettings,
  onToggleCinemaMode,
  onTriggerPip,
  isBackgroundAudioEnabled = true,
  onToggleBackgroundAudio,
  onSkipNext,
}: LiquidGlassNavBarProps) {
  const insets = useSafeAreaInsets()
  const [internalHidden, setInternalHidden] = useState(false)
  const isBarHidden = isHidden !== undefined ? isHidden : internalHidden

  const handleToggleHide = () => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    } catch {}
    if (onToggleHide) {
      onToggleHide()
    } else {
      setInternalHidden((prev) => !prev)
    }
  }

  const [isEditing, setIsEditing] = useState(false)
  const [inputText, setInputText] = useState('')
  const [showQuickMenu, setShowQuickMenu] = useState(false)
  const inputRef = useRef<TextInput>(null)

  // Animated progress bar width
  const progressAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isLoading) {
      Animated.timing(progressAnim, {
        toValue: Math.max(loadProgress, 0.15),
        duration: 200,
        useNativeDriver: false,
      }).start()
    } else {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start(() => {
        progressAnim.setValue(0)
      })
    }
  }, [isLoading, loadProgress, progressAnim])

  // Extract clean domain for display
  const displayDomain = React.useMemo(() => {
    try {
      return currentUrl.replace(/^https?:\/\//i, '').split('/')[0] || 'Search or enter URL'
    } catch {
      return currentUrl || 'Search or enter URL'
    }
  }, [currentUrl])

  const handleStartEditing = () => {
    setInputText(currentUrl)
    setIsEditing(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  const handleCancelEditing = () => {
    setIsEditing(false)
    Keyboard.dismiss()
  }

  const handleSubmit = () => {
    const raw = inputText.trim()
    if (!raw) return

    let target = raw
    const hasProtocol = /^https?:\/\//i.test(raw)
    const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i.test(raw)

    if (hasProtocol) {
      target = raw
    } else if (isDomain) {
      target = `https://${raw}`
    } else {
      target = `https://www.google.com/search?q=${encodeURIComponent(raw)}`
    }

    setIsEditing(false)
    Keyboard.dismiss()
    onNavigate(target)
  }

  // Floating top position calculation
  const topPosition = Math.max(insets.top + (Platform.OS === 'ios' ? 4 : 8), 36)

  // Apple Material Glass colors
  const glassBackground = isDark ? 'rgba(28, 28, 30, 0.68)' : 'rgba(255, 255, 255, 0.72)'
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.08)'
  const specularRim = isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(255, 255, 255, 0.90)'
  const textColor = isDark ? '#f8fafc' : '#0f172a'
  const textMutedColor = isDark ? '#94a3b8' : '#64748b'
  const controlBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
  const accentColor = isDark ? '#38bdf8' : '#0284c7'

  if (isPipActive) {
    return null
  }

  if (isBarHidden) {
    return (
      <View style={[styles.minimizedContainer, { top: topPosition }]} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleToggleHide}
          accessibilityLabel="Show Browser Bar"
          style={styles.minimizedTouch}
        >
          <View
            style={[
              styles.minimizedPill,
              {
                backgroundColor: glassBackground,
                borderColor: glassBorder,
              },
            ]}
          >
            <BlurView
              intensity={75}
              tint={
                isDark
                  ? (Platform.OS === 'ios' ? ('systemUltraThinMaterialDark' as any) : 'dark')
                  : (Platform.OS === 'ios' ? ('systemUltraThinMaterialLight' as any) : 'light')
              }
              style={StyleSheet.absoluteFillObject}
            />
            <Eye size={14} color={accentColor} style={styles.minimizedIcon} />
            <Text style={[styles.minimizedText, { color: textColor }]}>Show</Text>
          </View>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.outerContainer, { top: topPosition }]}>
      <View
        style={[
          styles.glassPill,
          {
            backgroundColor: glassBackground,
            borderColor: glassBorder,
          },
        ]}
      >
        {/* Native Hardware-Accelerated Frosted Blur Layer */}
        <BlurView
          intensity={75}
          tint={
            isDark
              ? (Platform.OS === 'ios' ? ('systemUltraThinMaterialDark' as any) : 'dark')
              : (Platform.OS === 'ios' ? ('systemUltraThinMaterialLight' as any) : 'light')
          }
          style={StyleSheet.absoluteFillObject}
        />

        {/* Specular Top Rim Gleam */}
        <View style={[styles.specularRimGleam, { backgroundColor: specularRim }]} />

        {/* Omnibox Content */}
        <View style={styles.navRow}>
          {/* Back & Forward Controls */}
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canGoBack}
            onPress={onBack}
            style={[styles.iconButton, !canGoBack && styles.buttonDisabled]}
          >
            <ArrowLeft size={16} color={canGoBack ? textColor : textMutedColor} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canGoForward}
            onPress={onForward}
            style={[styles.iconButton, !canGoForward && styles.buttonDisabled]}
          >
            <ArrowRight size={16} color={canGoForward ? textColor : textMutedColor} />
          </TouchableOpacity>

          {/* Central Omnibox Search Field */}
          {isEditing ? (
            <View style={[styles.omniboxEditingWrap, { backgroundColor: controlBg }]}>
              <Search size={14} color={accentColor} style={styles.searchIcon} />
              <TextInput
                ref={inputRef}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Search web or enter URL..."
                placeholderTextColor={textMutedColor}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                style={[styles.omniboxInput, { color: textColor }]}
              />
              <TouchableOpacity activeOpacity={0.7} onPress={handleCancelEditing} style={styles.clearBtn}>
                <X size={14} color={textMutedColor} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleStartEditing}
              style={[styles.omniboxDisplayTouch, { backgroundColor: controlBg }]}
            >
              <Lock size={12} color={accentColor} style={styles.lockIcon} />
              <Text style={[styles.domainText, { color: textColor }]} numberOfLines={1}>
                {displayDomain}
              </Text>
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          {isEditing ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubmit}
              style={[styles.actionPill, { backgroundColor: accentColor }]}
            >
              <Text style={styles.actionPillText}>Go</Text>
            </TouchableOpacity>
          ) : (
            <>
              {/* Home Favorites Trigger */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onOpenHome}
                style={[styles.iconButton, { backgroundColor: controlBg }]}
              >
                <Home size={15} color={textColor} />
              </TouchableOpacity>

              {/* Reload / Refresh */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onReload}
                style={[styles.iconButton, { backgroundColor: controlBg }]}
              >
                <RotateCw size={14} color={textColor} />
              </TouchableOpacity>

              {/* Hide / Minimize Top Island Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleToggleHide}
                style={[styles.iconButton, { backgroundColor: controlBg }]}
                accessibilityLabel="Hide Top Island"
              >
                <EyeOff size={15} color={textColor} />
              </TouchableOpacity>

              {/* Quick Menu Toggle (PiP, Cinema, Settings) */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowQuickMenu(!showQuickMenu)}
                style={[
                  styles.iconButton,
                  { backgroundColor: controlBg },
                  showQuickMenu && { borderColor: accentColor, borderWidth: 1 },
                ]}
              >
                <Sliders size={14} color={showQuickMenu ? accentColor : textColor} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Live Bottom Progress Line */}
        {isLoading && (
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: accentColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        )}
      </View>

      {/* Floating Quick Feature Drawer */}
      {showQuickMenu && (
        <View
          style={[
            styles.quickMenuDrawer,
            {
              backgroundColor: glassBackground,
              borderColor: glassBorder,
            },
          ]}
        >
          <BlurView
            intensity={85}
            tint={
              isDark
                ? (Platform.OS === 'ios' ? ('systemUltraThinMaterialDark' as any) : 'dark')
                : (Platform.OS === 'ios' ? ('systemUltraThinMaterialLight' as any) : 'light')
            }
            style={StyleSheet.absoluteFillObject}
          />
          {/* Row 1: Media & Stream Controls */}
          <View style={styles.quickMenuRow}>
            {/* System PiP Trigger */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setShowQuickMenu(false)
                onTriggerPip?.()
              }}
              style={styles.quickMenuItem}
            >
              <PictureInPicture2 size={16} color={accentColor} />
              <Text style={[styles.quickMenuLabel, { color: textColor }]}>PiP Window</Text>
            </TouchableOpacity>

            {/* Cinema Video Player */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setShowQuickMenu(false)
                onToggleCinemaMode?.()
              }}
              style={styles.quickMenuItem}
            >
              <Tv size={16} color={isCinemaMode ? accentColor : textColor} />
              <Text style={[styles.quickMenuLabel, { color: textColor }]}>Cinema</Text>
            </TouchableOpacity>

            {/* Background Audio Mode Toggle */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                onToggleBackgroundAudio?.()
              }}
              style={styles.quickMenuItem}
            >
              <Headphones
                size={16}
                color={isBackgroundAudioEnabled ? '#10b981' : textMutedColor}
              />
              <Text
                style={[
                  styles.quickMenuLabel,
                  { color: isBackgroundAudioEnabled ? '#10b981' : textColor },
                ]}
              >
                {isBackgroundAudioEnabled ? 'Audio ON' : 'Audio Mode'}
              </Text>
            </TouchableOpacity>

            {/* Skip to Next Video */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setShowQuickMenu(false)
                onSkipNext?.()
              }}
              style={styles.quickMenuItem}
            >
              <SkipForward size={16} color={textColor} />
              <Text style={[styles.quickMenuLabel, { color: textColor }]}>Next Video</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Browser Tools & Shortcuts */}
          <View style={[styles.quickMenuRow, { marginTop: 8 }]}>
            {/* Portals Hub */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setShowQuickMenu(false)
                onOpenPortals?.()
              }}
              style={styles.quickMenuItem}
            >
              <Compass size={16} color={textColor} />
              <Text style={[styles.quickMenuLabel, { color: textColor }]}>Portals</Text>
            </TouchableOpacity>

            {/* Downloads */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setShowQuickMenu(false)
                onOpenDownloads?.()
              }}
              style={styles.quickMenuItem}
            >
              <Download size={16} color={textColor} />
              <Text style={[styles.quickMenuLabel, { color: textColor }]}>Files</Text>
            </TouchableOpacity>

            {/* Shields Ad Blocker */}
            {onOpenShields && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  setShowQuickMenu(false)
                  onOpenShields()
                }}
                style={styles.quickMenuItem}
              >
                <ShieldCheck size={16} color={shieldsEnabled ? '#10b981' : textMutedColor} />
                <Text style={[styles.quickMenuLabel, { color: textColor }]}>
                  {blockedAdsCount > 0 ? `${blockedAdsCount} Ads` : 'Shields'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Settings */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setShowQuickMenu(false)
                onOpenSettings?.()
              }}
              style={styles.quickMenuItem}
            >
              <Sliders size={16} color={textColor} />
              <Text style={[styles.quickMenuLabel, { color: textColor }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  glassPill: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  specularRimGleam: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    opacity: 0.9,
    borderRadius: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    height: 48,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  omniboxDisplayTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    gap: 6,
  },
  lockIcon: {
    marginTop: 1,
  },
  domainText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  omniboxEditingWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  omniboxInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  actionPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  shieldsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 32,
    borderRadius: 16,
    gap: 4,
  },
  shieldsCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2.5,
  },
  quickMenuDrawer: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  quickMenuRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  quickMenuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
  },
  quickMenuLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  minimizedContainer: {
    position: 'absolute',
    right: 14,
    zIndex: 9999,
  },
  minimizedTouch: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  minimizedPill: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimizedIcon: {
    marginRight: 6,
  },
  minimizedText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
})
