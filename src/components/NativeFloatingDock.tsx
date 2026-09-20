import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native'
import {
  Compass,
  Download,
  Film,
  Tv,
  PictureInPicture2,
  ArrowLeft,
  RotateCw,
  Minimize2,
  Maximize2,
} from 'lucide-react-native'
import { AppTab } from '../types'
import { THEME } from '../theme/tokens'
import { LiquidGlassContainer, LiquidGlassButton } from './LiquidGlass'

interface NativeFloatingDockProps {
  activeTab: AppTab
  onSelectTab: (tab: AppTab) => void
  activeDownloadsCount: number
  onTogglePip: () => void
  isPipActive: boolean
  onBack: () => void
  onReload: () => void
}

export function NativeFloatingDock({
  activeTab,
  onSelectTab,
  activeDownloadsCount,
  onTogglePip,
  onBack,
  onReload,
  isPipActive,
}: NativeFloatingDockProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Collapsed State: A discreet, liquid glass edge pearl
  if (isCollapsed) {
    return (
      <View style={styles.collapsedContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsCollapsed(false)}
        >
          <LiquidGlassContainer type="pill" variant="floating" style={styles.collapsedPearl}>
            <View style={styles.pearlGlowDot} />
            <Text style={styles.pearlText}>StreamNest</Text>
            <Maximize2 size={12} color={THEME.colors.textSecondary} />
          </LiquidGlassContainer>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.dockContainer}>
      <LiquidGlassContainer type="pill" variant="floating" style={styles.liquidDock}>
        {/* Navigation Controls */}
        <View style={styles.navControls}>
          <LiquidGlassButton
            type="circle"
            size={26}
            onPress={onBack}
          >
            <ArrowLeft size={13} color={THEME.colors.textSecondary} />
          </LiquidGlassButton>
          <LiquidGlassButton
            type="circle"
            size={26}
            onPress={onReload}
          >
            <RotateCw size={12} color={THEME.colors.textSecondary} />
          </LiquidGlassButton>
        </View>

        {/* Primary Tabs */}
        <View style={styles.tabsRow}>
          {/* App / Browser */}
          <LiquidGlassButton
            type="pill"
            size={34}
            active={activeTab === 'browser'}
            activeColor={THEME.colors.accent}
            onPress={() => onSelectTab('browser')}
          >
            <View style={styles.tabItemInner}>
              <Tv
                size={14}
                color={activeTab === 'browser' ? THEME.colors.accent : THEME.colors.textSecondary}
              />
              <Text style={[styles.tabLabel, activeTab === 'browser' && styles.tabLabelActive]}>
                App
              </Text>
            </View>
          </LiquidGlassButton>

          {/* Portals */}
          <LiquidGlassButton
            type="pill"
            size={34}
            active={activeTab === 'portals'}
            activeColor={THEME.colors.accent}
            onPress={() => onSelectTab('portals')}
          >
            <View style={styles.tabItemInner}>
              <Compass
                size={14}
                color={activeTab === 'portals' ? THEME.colors.accent : THEME.colors.textSecondary}
              />
              <Text style={[styles.tabLabel, activeTab === 'portals' && styles.tabLabelActive]}>
                Portals
              </Text>
            </View>
          </LiquidGlassButton>

          {/* Center Orb: PiP Launcher */}
          <LiquidGlassButton
            type="circle"
            size={38}
            active={isPipActive}
            activeColor={THEME.colors.accent}
            onPress={onTogglePip}
          >
            <PictureInPicture2
              size={16}
              color={isPipActive ? '#06070a' : THEME.colors.textPrimary}
            />
          </LiquidGlassButton>

          {/* Downloads / Offline */}
          <LiquidGlassButton
            type="pill"
            size={34}
            active={activeTab === 'downloads'}
            activeColor={THEME.colors.accent}
            onPress={() => onSelectTab('downloads')}
          >
            <View style={styles.tabItemInner}>
              <View>
                <Download
                  size={14}
                  color={activeTab === 'downloads' ? THEME.colors.accent : THEME.colors.textSecondary}
                />
                {activeDownloadsCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{activeDownloadsCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, activeTab === 'downloads' && styles.tabLabelActive]}>
                Offline
              </Text>
            </View>
          </LiquidGlassButton>

          {/* Cinema */}
          <LiquidGlassButton
            type="pill"
            size={34}
            active={activeTab === 'cinema'}
            activeColor={THEME.colors.accent}
            onPress={() => onSelectTab('cinema')}
          >
            <View style={styles.tabItemInner}>
              <Film
                size={14}
                color={activeTab === 'cinema' ? THEME.colors.accent : THEME.colors.textSecondary}
              />
              <Text style={[styles.tabLabel, activeTab === 'cinema' && styles.tabLabelActive]}>
                Cinema
              </Text>
            </View>
          </LiquidGlassButton>
        </View>

        {/* Edge Collapse Button */}
        <LiquidGlassButton
          type="circle"
          size={26}
          onPress={() => setIsCollapsed(true)}
          accessibilityLabel="Hide Dock"
        >
          <Minimize2 size={12} color={THEME.colors.textMuted} />
        </LiquidGlassButton>
      </LiquidGlassContainer>
    </View>
  )
}

const styles = StyleSheet.create({
  dockContainer: {
    position: 'absolute',
    bottom: 25,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 85,
  },
  liquidDock: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    paddingRight: 6,
    marginRight: 4,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 9,
    marginTop: 1,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#06070a',
    fontSize: 7,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '900',
  },
  collapsedContainer: {
    position: 'absolute',
    bottom: 25,
    right: 16,
    zIndex: 85,
  },
  collapsedPearl: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
  },
  pearlGlowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.accent,
  },
  pearlText: {
    color: THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
})
