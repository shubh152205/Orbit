import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Alert,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  X,
  Search,
  ArrowRight,
  Plus,
  Trash2,
  ExternalLink,
  Compass,
  Bookmark,
  Check,
  Globe,
  Youtube,
  Tv,
  Film,
  Zap,
  Play,
  Flame,
  Sun,
  Moon,
  Smartphone,
} from 'lucide-react-native'

import { LiquidGlassContainer } from './LiquidGlass'
import { THEME, getThemeColors } from '../theme/tokens'
import { ThemeMode, STORAGE_THEME_MODE_KEY } from '../services/themeEngine'

const STORAGE_CUSTOM_LINKS_KEY = '@streamnest_custom_links'

export interface ThemeModeOption {
  id: ThemeMode
  name: string
  subtitle: string
  icon: React.ComponentType<any>
}

export const THEME_MODE_OPTIONS: ThemeModeOption[] = [
  {
    id: 'dark',
    name: 'Dark',
    subtitle: 'Converts web to dark',
    icon: Moon,
  },
  {
    id: 'light',
    name: 'Light',
    subtitle: 'Natural day web view',
    icon: Sun,
  },
  {
    id: 'auto',
    name: 'System',
    subtitle: 'Syncs with device mode',
    icon: Smartphone,
  },
]

export interface PreloadedPortal {
  id: string
  name: string
  url: string
  domain: string
  bgColor: string
  iconColor: string
  icon: React.ComponentType<any>
}

export const PRELOADED_PORTALS: PreloadedPortal[] = [
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com', domain: 'youtube.com', bgColor: '#cc0000', iconColor: '#ffffff', icon: Youtube },
  { id: 'cineby', name: 'Cineby', url: 'https://cineby.net', domain: 'cineby.net', bgColor: '#0284c7', iconColor: '#ffffff', icon: Film },
  { id: 'fmhy', name: 'FMHY Hub', url: 'https://fmhy.net', domain: 'fmhy.net', bgColor: '#7c3aed', iconColor: '#ffffff', icon: Compass },
  { id: 'vidsrc', name: 'VidSrc', url: 'https://vidsrc.to', domain: 'vidsrc.to', bgColor: '#059669', iconColor: '#ffffff', icon: Play },
  { id: 'netflix', name: 'Netflix', url: 'https://www.netflix.com', domain: 'netflix.com', bgColor: '#18181b', iconColor: '#e50914', icon: Film },
  { id: 'hianime', name: 'HiAnime', url: 'https://hianime.to', domain: 'hianime.to', bgColor: '#d97706', iconColor: '#ffffff', icon: Zap },
  { id: 'twitch', name: 'Twitch', url: 'https://www.twitch.tv', domain: 'twitch.tv', bgColor: '#9333ea', iconColor: '#ffffff', icon: Tv },
  { id: 'reddit', name: 'Reddit', url: 'https://www.reddit.com', domain: 'reddit.com', bgColor: '#ea580c', iconColor: '#ffffff', icon: Globe },
]

export interface CustomLinkItem {
  id: string
  title: string
  url: string
  createdAt: number
}

export interface NativeHomeScreenProps {
  visible: boolean
  onClose: () => void
  onNavigate: (url: string) => void
  currentTheme?: ThemeMode
  onSelectTheme?: (theme: ThemeMode) => void
  recentUrls?: string[]
}

export function NativeHomeScreen({
  visible,
  onClose,
  onNavigate,
  currentTheme = 'dark',
  onSelectTheme,
  recentUrls = [],
}: NativeHomeScreenProps) {
  const validModes: ThemeMode[] = ['dark', 'light', 'auto']
  const initialTheme: ThemeMode = validModes.includes(currentTheme as any) ? (currentTheme as ThemeMode) : 'dark'
  const [activeThemeId, setActiveThemeId] = useState<ThemeMode>(initialTheme)
  const [searchQuery, setSearchQuery] = useState('')
  const [customLinks, setCustomLinks] = useState<CustomLinkItem[]>([])

  // Custom link form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')

  // Sync state if currentTheme changes
  useEffect(() => {
    if (currentTheme && validModes.includes(currentTheme as any)) {
      setActiveThemeId(currentTheme)
    }
  }, [currentTheme])

  // Load custom links and theme
  useEffect(() => {
    ;(async () => {
      try {
        const storedLinks = await AsyncStorage.getItem(STORAGE_CUSTOM_LINKS_KEY)
        if (storedLinks) {
          setCustomLinks(JSON.parse(storedLinks))
        } else {
          const initialLinks: CustomLinkItem[] = [
            { id: '1', title: 'Cineby Cinema', url: 'https://cineby.net', createdAt: Date.now() },
            { id: '2', title: 'FMHY Media Hub', url: 'https://fmhy.net', createdAt: Date.now() },
            { id: '3', title: 'VidSrc Streams', url: 'https://vidsrc.to', createdAt: Date.now() },
          ]
          setCustomLinks(initialLinks)
          await AsyncStorage.setItem(STORAGE_CUSTOM_LINKS_KEY, JSON.stringify(initialLinks))
        }

        const storedTheme = await AsyncStorage.getItem(STORAGE_THEME_MODE_KEY)
        if (storedTheme && validModes.includes(storedTheme as any)) {
          setActiveThemeId(storedTheme as ThemeMode)
          onSelectTheme?.(storedTheme as ThemeMode)
        }
      } catch (err) {
        console.warn('Failed to load home screen data:', err)
      }
    })()
  }, [])

  const handleSelectTheme = async (themeMode: ThemeMode) => {
    setActiveThemeId(themeMode)
    onSelectTheme?.(themeMode)
    try {
      await AsyncStorage.setItem(STORAGE_THEME_MODE_KEY, themeMode)
    } catch {}
  }

  const handleSearchSubmit = () => {
    const query = searchQuery.trim()
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
    onClose()
  }

  const handleAddCustomLink = async () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      Alert.alert('Required Fields', 'Please enter both a title and website URL.')
      return
    }

    let urlToSave = newUrl.trim()
    if (!/^https?:\/\//i.test(urlToSave)) {
      urlToSave = `https://${urlToSave}`
    }

    const newItem: CustomLinkItem = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      url: urlToSave,
      createdAt: Date.now(),
    }

    const updated = [newItem, ...customLinks]
    setCustomLinks(updated)
    setNewTitle('')
    setNewUrl('')
    setShowAddForm(false)

    try {
      await AsyncStorage.setItem(STORAGE_CUSTOM_LINKS_KEY, JSON.stringify(updated))
    } catch {}
  }

  const handleDeleteCustomLink = async (id: string) => {
    const updated = customLinks.filter((item) => item.id !== id)
    setCustomLinks(updated)
    try {
      await AsyncStorage.setItem(STORAGE_CUSTOM_LINKS_KEY, JSON.stringify(updated))
    } catch {}
  }

  const systemColorScheme = useColorScheme()
  const isDark = activeThemeId === 'auto' ? systemColorScheme === 'dark' : activeThemeId === 'dark'
  const colors = getThemeColors(isDark)
  const accentColor = colors.accent

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.canvas }]}>
        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.headerTitleCol}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Favorites</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Quick Access & Bookmarks</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            accessibilityLabel="Close"
            style={[styles.closeBtn, { backgroundColor: colors.surfaceRaised }]}
          >
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Search Bar */}
          <LiquidGlassContainer
            type="pill"
            variant="floating"
            style={[styles.searchContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.borderSubtle }]}
          >
            <View style={styles.searchRow}>
              <Search size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search web or enter URL..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                onSubmitEditing={handleSearchSubmit}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSearchSubmit}
                style={[styles.searchGoBtn, { backgroundColor: accentColor }]}
              >
                <ArrowRight size={14} color={isDark ? '#06070a' : '#ffffff'} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </LiquidGlassContainer>

          {/* Section 1: Preloaded Favorites Grid (iOS Speed Dial Style) */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>FAVORITES</Text>
            <View style={styles.appGrid}>
              {PRELOADED_PORTALS.map((portal) => {
                const Icon = portal.icon
                return (
                  <TouchableOpacity
                    key={portal.id}
                    activeOpacity={0.72}
                    onPress={() => {
                      onNavigate(portal.url)
                      onClose()
                    }}
                    style={styles.appCol}
                  >
                    <View style={[styles.appIconSquircle, { backgroundColor: portal.bgColor }]}>
                      <Icon size={24} color={portal.iconColor} />
                    </View>
                    <Text style={[styles.appTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {portal.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Section 2: Custom Saved Bookmarks */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderBetween}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>BOOKMARKS</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowAddForm(!showAddForm)}
                style={styles.addLinkToggle}
              >
                <Plus size={14} color={accentColor} style={{ marginRight: 4 }} />
                <Text style={[styles.addLinkText, { color: accentColor }]}>
                  {showAddForm ? 'Done' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inline Add Link Form */}
            {showAddForm && (
              <LiquidGlassContainer
                type="rounded"
                borderRadius={16}
                variant="card"
                style={[styles.formCard, { backgroundColor: colors.surfaceCard, borderColor: colors.borderMedium }]}
              >
                <View style={styles.formInner}>
                  <Text style={[styles.formTitle, { color: colors.textPrimary }]}>New Bookmark</Text>
                  <TextInput
                    value={newTitle}
                    onChangeText={setNewTitle}
                    placeholder="Title (e.g. My Cinema)"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.inputField, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderMedium, color: colors.textPrimary }]}
                  />
                  <TextInput
                    value={newUrl}
                    onChangeText={setNewUrl}
                    placeholder="URL (e.g. https://cineby.net)"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    style={[styles.inputField, { backgroundColor: colors.surfaceRaised, borderColor: colors.borderMedium, color: colors.textPrimary }]}
                  />
                  <View style={styles.formActionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setShowAddForm(false)}
                      style={styles.cancelBtn}
                    >
                      <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleAddCustomLink}
                      style={[styles.saveBtn, { backgroundColor: accentColor }]}
                    >
                      <Text style={[styles.saveText, { color: isDark ? '#06070a' : '#ffffff' }]}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LiquidGlassContainer>
            )}

            {/* Bookmarks List */}
            {customLinks.length === 0 ? (
              <View style={styles.emptyBookmarks}>
                <Bookmark size={20} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No saved bookmarks yet</Text>
              </View>
            ) : (
              <View style={[styles.bookmarkListContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.borderSubtle }]}>
                {customLinks.map((item, idx) => {
                  const domain = item.url.replace(/^https?:\/\//, '').split('/')[0]
                  const initial = item.title.charAt(0).toUpperCase()
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.bookmarkRow,
                        idx < customLinks.length - 1 && [styles.bookmarkDivider, { borderBottomColor: colors.borderSubtle }],
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          onNavigate(item.url)
                          onClose()
                        }}
                        style={styles.bookmarkMainTouch}
                      >
                        <View style={[styles.bookmarkIconSquare, { backgroundColor: isDark ? `${accentColor}20` : `${accentColor}15` }]}>
                          <Text style={[styles.bookmarkInitial, { color: accentColor }]}>
                            {initial}
                          </Text>
                        </View>
                        <View style={styles.bookmarkTextCol}>
                          <Text style={[styles.bookmarkTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={[styles.bookmarkDomain, { color: colors.textSecondary }]} numberOfLines={1}>
                            {domain}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeleteCustomLink(item.id)}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={15} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            )}
          </View>

          {/* Section 3: Browser & Website Theme Mode (Dark / Light / System) */}
          <View style={styles.sectionBlock}>
            <View style={styles.appearanceHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
              <Text style={[styles.appearanceSubLabel, { color: colors.textSecondary }]}>Applies native dark/light themes</Text>
            </View>

            <View style={styles.themeCardsRow}>
              {THEME_MODE_OPTIONS.map((t) => {
                const isSelected = t.id === activeThemeId
                const IconComponent = t.icon
                return (
                  <TouchableOpacity
                    key={t.id}
                    activeOpacity={0.75}
                    onPress={() => handleSelectTheme(t.id)}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.08)')
                          : colors.surfaceCard,
                        borderColor: isSelected ? accentColor : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.themeCardIconWrap,
                        {
                          backgroundColor: isSelected
                            ? (isDark ? 'rgba(56, 189, 248, 0.20)' : 'rgba(2, 132, 199, 0.16)')
                            : colors.surfaceRaised,
                        },
                      ]}
                    >
                      <IconComponent
                        size={20}
                        color={isSelected ? accentColor : colors.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.themeCardTitle,
                        { color: isSelected ? accentColor : colors.textPrimary },
                      ]}
                    >
                      {t.name}
                    </Text>
                    <Text style={[styles.themeCardSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                      {t.subtitle}
                    </Text>
                    {isSelected && (
                      <View style={[styles.activeCheckPill, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)', borderColor: isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.3)' }]}>
                        <Check size={10} color={accentColor} strokeWidth={3} />
                        <Text style={[styles.activeCheckText, { color: accentColor }]}>Active</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#07090e',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  headerSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    gap: 28,
  },
  searchContainer: {
    width: '100%',
    borderRadius: 9999,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 0,
    marginRight: 10,
  },
  searchGoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBlock: {
    gap: 12,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addLinkToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
    columnGap: 12,
  },
  appCol: {
    width: '22%',
    alignItems: 'center',
  },
  appIconSquircle: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  appTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    marginBottom: 10,
  },
  formInner: {
    padding: 16,
    gap: 12,
  },
  formTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  inputField: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  cancelText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveText: {
    color: '#06070a',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyBookmarks: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  bookmarkListContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  bookmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bookmarkDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  bookmarkMainTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookmarkIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkInitial: {
    fontSize: 15,
    fontWeight: '800',
  },
  bookmarkTextCol: {
    flex: 1,
  },
  bookmarkTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  bookmarkDomain: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 8,
  },
  appearanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  appearanceSubLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '400',
  },
  themeCardsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  themeCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 112,
    justifyContent: 'space-between',
  },
  themeCardActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.55)',
  },
  themeCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  themeCardIconWrapActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
  },
  themeCardIconWrapInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  themeCardTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  themeCardTitleActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  themeCardSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9.5,
    textAlign: 'center',
    lineHeight: 12,
  },
  activeCheckPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  activeCheckText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '700',
  },
})
