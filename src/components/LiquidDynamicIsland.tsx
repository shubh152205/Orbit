import React, { useState, useRef, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  Image,
  UIManager,
} from 'react-native'
import {
  ShieldCheck,
  Shield,
  Search,
  ChevronDown,
  Globe,
  ArrowRight,
  History,
  X,
  RotateCw,
  ArrowLeft,
  Monitor,
  Smartphone,
  Download,
  Compass,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Tv,
  Home,
  PictureInPicture2,
  Minimize2,
  Maximize2,
  Moon,
} from 'lucide-react-native'
import { THEME } from '../theme/tokens'
import { LiquidGlassContainer, LiquidGlassButton } from './LiquidGlass'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

try {
  if (Platform.OS === 'android' && UIManager?.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
  }
} catch {}

const VERIFIED_QUICK_PORTALS = [
  { name: 'Cineby', url: 'https://cineby.net' },
  { name: 'FMHY', url: 'https://fmhy.net' },
  { name: 'VidSrc', url: 'https://vidsrc.to' },
  { name: 'HiAnime', url: 'https://hianime.to' },
  { name: 'Braflix', url: 'https://braflix.gd' },
  { name: 'StreamEast', url: 'https://thestreameast.to' },
  { name: 'AutoEmbed', url: 'https://autoembed.to' },
]

export interface LiquidDynamicIslandProps {
  topOffset?: number
  currentUrl: string
  pageTitle?: string
  isLoading?: boolean
  canGoBack?: boolean
  canGoForward?: boolean
  isDesktopMode?: boolean
  activeDownloadsCount?: number
  shieldsEnabled?: boolean
  blockedAdsCount?: number
  isCleanMode?: boolean
  onToggleCleanMode?: () => void
  onOpenShields?: () => void
  onOpenHome?: () => void
  isVideoStreaming?: boolean
  onNavigate: (url: string) => void
  onBack?: () => void
  onForward?: () => void
  onReload?: () => void
  onToggleDesktopMode?: () => void
  onToggleCinemaMode: () => void
  isCinemaMode: boolean
  onTogglePip: () => void
  isPipActive: boolean
  onOpenDownloads: () => void
  onOpenPortals: () => void
  onOpenSettings: () => void
  recentUrls: string[]
  onToggleScreenOff?: () => void
  isScreenOff?: boolean
}

export function LiquidDynamicIsland({
  topOffset,
  currentUrl,
  pageTitle,
  isLoading,
  canGoBack,
  canGoForward,
  isDesktopMode,
  activeDownloadsCount = 0,
  shieldsEnabled = true,
  blockedAdsCount = 0,
  isCleanMode = false,
  onToggleCleanMode,
  onOpenShields,
  onOpenHome,
  isVideoStreaming = false,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onToggleDesktopMode,
  onToggleCinemaMode,
  isCinemaMode,
  onTogglePip,
  isPipActive,
  onOpenDownloads,
  onOpenPortals,
  onOpenSettings,
  recentUrls,
  onToggleScreenOff,
  isScreenOff = false,
}: LiquidDynamicIslandProps) {
  const insets = useSafeAreaInsets()
  const effectiveTop =
    topOffset !== undefined
      ? topOffset
      : Math.max(insets.top + (Platform.OS === 'ios' ? 4 : 8), 38)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [inputUrl, setInputUrl] = useState(currentUrl)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    setInputUrl(currentUrl)
  }, [currentUrl])

  const host = currentUrl.replace(/^https?:\/\//, '').split('/')[0] || 'Browser'
  const isHttps = currentUrl.startsWith('https://')
  const displayTitle = pageTitle && pageTitle !== host ? pageTitle : host

  const toggleExpand = (expand: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded(expand)
    if (expand) {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }

  const toggleMinimize = (minimize: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring)
    setIsMinimized(minimize)
    if (minimize) setIsExpanded(false)
  }

  const handleSubmit = () => {
    const query = inputUrl.trim()
    if (!query) return

    let destination = query
    const hasProtocol = /^https?:\/\//i.test(query)
    const looksLikeUrl = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/i.test(query)

    if (hasProtocol) {
      destination = query
    } else if (looksLikeUrl) {
      destination = `https://${query}`
    } else {
      destination = `https://www.google.com/search?q=${encodeURIComponent(query)}`
    }

    onNavigate(destination)
    toggleExpand(false)
  }

  // 1. Clean Immersion Mode (Minimal Floating Pill)
  if (isCleanMode) {
    return (
      <View style={[styles.floatingWrapper, { top: effectiveTop }]} pointerEvents="box-none">
        <TouchableOpacity activeOpacity={0.8} onPress={onToggleCleanMode}>
          <LiquidGlassContainer
            type="pill"
            variant="floating"
            edgeIntensity={0.08}
            rimIntensity={0.16}
            blurRadius={9}
            tintOpacity={0.22}
            style={styles.cleanPill}
          >
            <View style={styles.cleanPillContent}>
              <Eye size={13} color={THEME.colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.cleanPillText}>Exit Clean Mode</Text>
            </View>
          </LiquidGlassContainer>
        </TouchableOpacity>
      </View>
    )
  }

  // 2. Minimized Micro-Island (Converts whole island into a small circle of icon size)
  if (isMinimized) {
    return (
      <View
        style={[
          styles.floatingWrapper,
          {
            top: effectiveTop,
            alignItems: 'flex-end',
            paddingRight: 0,
            right: 0,
          },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleMinimize(false)}
          accessibilityLabel="Show Island"
          hitSlop={{ top: 15, bottom: 15, left: 20, right: 10 }}
        >
          <Image
            source={require('../../assets/peeking-cat.png')}
            style={{ width: 44, height: 118 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    )
  }

  // 3. Standard Floating Island (iPhone Liquid Glass from reference image)
  return (
    <View style={[styles.floatingWrapper, { top: effectiveTop }]} pointerEvents="box-none">
      {!isExpanded ? (
        /* COMPACT FLOATING CAPSULE */
        <LiquidGlassContainer
          type="pill"
          variant="floating"
          style={styles.compactIslandPill}
        >
          <View style={styles.compactRow}>
            {/* Navigation Back Button / Globe Indicator */}
            {canGoBack && onBack ? (
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={onBack}
                accessibilityLabel="Back"
                style={styles.islandActionBtn}
              >
                <ArrowLeft size={18} color="#ffffff" strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={() => toggleExpand(true)}
                accessibilityLabel="Address Bar"
                style={styles.islandActionBtn}
              >
                <Globe size={18} color="#ffffff" strokeWidth={1.8} />
              </TouchableOpacity>
            )}

            {/* Center Omnibox Indicator (Tappable to expand drawer) */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => toggleExpand(true)}
              style={styles.centerOmni}
            >
              <View style={styles.omniTopRow}>
                {isHttps && <Lock size={9} color="#34d399" style={{ marginRight: 4 }} />}
                <Text style={styles.omniTitle} numberOfLines={1}>
                  {displayTitle}
                </Text>
              </View>
              <Text style={styles.omniSub} numberOfLines={1}>
                {host}
              </Text>
            </TouchableOpacity>

            {/* Actions Cluster: Clean direct icons on Liquid Glass, exactly like iOS reference */}
            <View style={styles.actionsCluster}>
              {/* Home Screen Button */}
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={onOpenHome}
                accessibilityLabel="Home Hub"
                style={styles.islandActionBtn}
              >
                <Home size={18} color="#ffffff" strokeWidth={1.8} />
              </TouchableOpacity>

              {/* Verified Portals Hub */}
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={onOpenPortals}
                accessibilityLabel="Portals Hub"
                style={styles.islandActionBtn}
              >
                <Compass size={18} color="#ffffff" strokeWidth={1.8} />
              </TouchableOpacity>

              {/* Offline Downloads Hub */}
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={onOpenDownloads}
                accessibilityLabel="Downloads"
                style={styles.islandActionBtn}
              >
                <Download size={18} color="#ffffff" strokeWidth={1.8} />
                {activeDownloadsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{activeDownloadsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Picture-in-Picture Button (ONLY visible while video is streaming) */}
              {isVideoStreaming && (
                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={onTogglePip}
                  accessibilityLabel="Picture in Picture"
                  style={[styles.islandActionBtn, isPipActive && styles.islandActionBtnActive]}
                >
                  <PictureInPicture2 size={18} color={isPipActive ? '#38bdf8' : '#38bdf8'} strokeWidth={2} />
                </TouchableOpacity>
              )}

              {/* Screen Off Streaming Mode Button */}
              {isVideoStreaming && onToggleScreenOff && (
                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={onToggleScreenOff}
                  accessibilityLabel="Screen Off Streaming Mode"
                  style={[styles.islandActionBtn, isScreenOff && styles.islandActionBtnActive]}
                >
                  <Moon size={17} color={isScreenOff ? '#38bdf8' : '#ffffff'} strokeWidth={1.8} />
                </TouchableOpacity>
              )}

              {/* Hide / Minimize Button (Converts island into small circle) */}
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={() => toggleMinimize(true)}
                accessibilityLabel="Hide Island"
                style={styles.islandActionBtn}
              >
                <EyeOff size={16} color="rgba(255, 255, 255, 0.70)" strokeWidth={1.8} />
              </TouchableOpacity>
            </View>
          </View>
        </LiquidGlassContainer>
      ) : (
        /* EXPANDED LIQUID GLASS SEARCH & CONTROL DRAWER */
        <LiquidGlassContainer
          type="rounded"
          borderRadius={24}
          variant="floating"
          style={styles.expandedIslandCard}
        >
          <View style={styles.expandedContent}>
            {/* Top Search & URL Bar */}
            <View style={styles.searchBarRow}>
              <Search size={15} color="#38bdf8" style={{ marginRight: 8 }} />
              <TextInput
                ref={inputRef}
                value={inputUrl}
                onChangeText={setInputUrl}
                placeholder="Search web or enter stream URL..."
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                style={styles.searchInput}
              />

              <LiquidGlassButton
                type="circle"
                size={30}
                onPress={handleSubmit}
                accessibilityLabel="Go"
                style={styles.goBtn}
              >
                <ArrowRight size={14} color="#06070a" />
              </LiquidGlassButton>

              <LiquidGlassButton
                type="circle"
                size={30}
                onPress={() => toggleExpand(false)}
                accessibilityLabel="Close"
              >
                <X size={14} color="#94a3b8" />
              </LiquidGlassButton>
            </View>

            {/* Quick Actions & Navigation Strip */}
            <View style={styles.quickToolsStrip}>
              {onOpenHome && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    toggleExpand(false)
                    onOpenHome()
                  }}
                  style={styles.toolPill}
                >
                  <Home size={13} color="#38bdf8" style={{ marginRight: 5 }} />
                  <Text style={styles.toolPillText}>Home Hub</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  toggleExpand(false)
                  onOpenPortals()
                }}
                style={styles.toolPill}
              >
                <Compass size={13} color="#38bdf8" style={{ marginRight: 5 }} />
                <Text style={styles.toolPillText}>Portals Hub</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  toggleExpand(false)
                  onOpenDownloads()
                }}
                style={styles.toolPill}
              >
                <Download size={13} color="#f8fafc" style={{ marginRight: 5 }} />
                <Text style={styles.toolPillText}>Downloads</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  toggleExpand(false)
                  onOpenSettings()
                }}
                style={styles.toolPill}
              >
                <Settings size={13} color="#94a3b8" style={{ marginRight: 5 }} />
                <Text style={styles.toolPillText}>Settings</Text>
              </TouchableOpacity>

              {onToggleScreenOff && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    toggleExpand(false)
                    onToggleScreenOff()
                  }}
                  style={[styles.toolPill, isScreenOff && styles.toolPillActive]}
                >
                  <Moon size={13} color={isScreenOff ? '#38bdf8' : '#94a3b8'} style={{ marginRight: 5 }} />
                  <Text style={[styles.toolPillText, isScreenOff && styles.toolPillTextActive]}>
                    Screen Off
                  </Text>
                </TouchableOpacity>
              )}

              {onToggleDesktopMode && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={onToggleDesktopMode}
                  style={[styles.toolPill, isDesktopMode && styles.toolPillActive]}
                >
                  {isDesktopMode ? (
                    <Monitor size={13} color="#38bdf8" style={{ marginRight: 5 }} />
                  ) : (
                    <Smartphone size={13} color="#94a3b8" style={{ marginRight: 5 }} />
                  )}
                  <Text style={[styles.toolPillText, isDesktopMode && styles.toolPillTextActive]}>
                    {isDesktopMode ? 'Desktop' : 'Mobile'}
                  </Text>
                </TouchableOpacity>
              )}

              {onToggleCleanMode && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    toggleExpand(false)
                    onToggleCleanMode()
                  }}
                  style={styles.toolPill}
                >
                  <EyeOff size={13} color="#94a3b8" style={{ marginRight: 5 }} />
                  <Text style={styles.toolPillText}>Clean</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Verified Streaming Portals Strip */}
            <View style={styles.portalsSection}>
              <View style={styles.sectionHeaderRow}>
                <History size={12} color="#38bdf8" style={{ marginRight: 6 }} />
                <Text style={styles.sectionHeaderText}>Verified Streaming Hubs</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.portalsScroll}
              >
                {VERIFIED_QUICK_PORTALS.map((portal) => (
                  <TouchableOpacity
                    key={portal.url}
                    activeOpacity={0.75}
                    onPress={() => {
                      setInputUrl(portal.url)
                      onNavigate(portal.url)
                      toggleExpand(false)
                    }}
                    style={styles.portalChip}
                  >
                    <Text style={styles.portalChipText}>{portal.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </LiquidGlassContainer>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    alignItems: 'center',
  },
  compactIslandPill: {
    width: '100%',
    borderRadius: 9999,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 50,
  },
  islandActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandActionBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.20)',
  },
  microCircleGlass: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerOmni: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  omniTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  omniTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  omniSub: {
    color: 'rgba(255, 255, 255, 0.60)',
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  actionsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  shieldBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#06070a',
    fontSize: 8,
    fontWeight: '900',
  },
  expandedIslandCard: {
    width: '100%',
    borderRadius: 24,
  },
  expandedContent: {
    padding: 12,
    gap: 12,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingLeft: 12,
    paddingRight: 4,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    paddingVertical: 0,
    marginRight: 6,
  },
  goBtn: {
    backgroundColor: '#38bdf8',
    marginRight: 4,
  },
  quickToolsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toolPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  toolPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  toolPillTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  portalsSection: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  portalsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  portalChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.10)',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  portalChipText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  cleanPill: {
    borderRadius: 9999,
  },
  cleanPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cleanPillText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  minimizedPill: {
    borderRadius: 9999,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
    marginRight: 6,
  },
  minimizedHost: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 120,
  },
})
