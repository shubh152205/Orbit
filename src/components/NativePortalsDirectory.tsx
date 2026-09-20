import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native'
import {
  Search,
  Film,
  Zap,
  Sparkles,
  Radio,
  Globe,
  CheckCircle2,
  X,
  ChevronRight,
} from 'lucide-react-native'
import { PortalItem } from '../types'
import { THEME } from '../theme/tokens'
import { LiquidGlassContainer } from './LiquidGlass'

export const CURATED_PORTALS: PortalItem[] = [
  {
    id: 'fmhy',
    name: 'FMHY Hub',
    url: 'https://fmhy.net',
    tagline: 'Community curated directory of free media and streaming sources',
    category: 'movies',
    badge: 'Directory',
    accentColor: '#a855f7',
  },
  {
    id: 'cineby',
    name: 'Cineby',
    url: 'https://cineby.net',
    tagline: 'Ad-light cinema streaming with auto-next and fast cloud servers',
    category: 'movies',
    badge: 'Movies & TV',
    accentColor: '#38bdf8',
  },
  {
    id: 'vidsrc',
    name: 'VidSrc',
    url: 'https://vidsrc.to',
    tagline: 'Direct cloud server playback with multi-source backup links',
    category: 'movies',
    badge: 'Streams',
    accentColor: '#10b981',
  },
  {
    id: 'braflix',
    name: 'Braflix',
    url: 'https://braflix.gd',
    tagline: 'Global catalog of movies and shows with minimal interruptions',
    category: 'movies',
    badge: 'Movies & TV',
    accentColor: '#38bdf8',
  },
  {
    id: 'hianime',
    name: 'HiAnime',
    url: 'https://hianime.to',
    tagline: 'HD subbed and dubbed anime episodes with release calendar',
    category: 'anime',
    badge: 'Anime',
    accentColor: '#f59e0b',
  },
  {
    id: 'animesuge',
    name: 'AnimeSuge',
    url: 'https://animesuge.to',
    tagline: 'Distraction-free anime streaming with chapter and intro skip',
    category: 'anime',
    badge: 'Anime',
    accentColor: '#38bdf8',
  },
  {
    id: 'streameast',
    name: 'StreamEast',
    url: 'https://thestreameast.to',
    tagline: 'Live sports coverage for football, basketball, F1, and UFC',
    category: 'live',
    badge: 'Live Sports',
    accentColor: '#10b981',
  },
  {
    id: 'vidlink',
    name: 'VidLink Pro',
    url: 'https://vidlink.pro',
    tagline: 'Mobile-optimized video embed player engine with PiP capability',
    category: 'embeds',
    badge: 'Player Engine',
    accentColor: '#38bdf8',
  },
  {
    id: 'autoembed',
    name: 'AutoEmbed',
    url: 'https://autoembed.to',
    tagline: 'Universal video extraction endpoint for mobile web browsers',
    category: 'embeds',
    badge: 'Extractor',
    accentColor: '#38bdf8',
  },
]

interface NativePortalsDirectoryProps {
  currentUrl: string
  onSelectPortal: (url: string) => void
  onClose?: () => void
}

export function NativePortalsDirectory({
  currentUrl,
  onSelectPortal,
  onClose,
}: NativePortalsDirectoryProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'movies' | 'anime' | 'embeds' | 'live'>('all')

  const categories = [
    { id: 'all', label: 'All', icon: Globe },
    { id: 'movies', label: 'Movies & TV', icon: Film },
    { id: 'anime', label: 'Anime', icon: Zap },
    { id: 'live', label: 'Live Sports', icon: Radio },
    { id: 'embeds', label: 'Embeds', icon: Sparkles },
  ] as const

  const filtered = CURATED_PORTALS.filter((item) => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory
    const matchesQuery =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.tagline.toLowerCase().includes(search.toLowerCase()) ||
      item.url.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesQuery
  })

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.modalHeaderRow}>
        <View style={styles.modalHeaderCol}>
          <Text style={styles.modalTitle}>Portals Hub</Text>
          <Text style={styles.modalSub}>Curated verified streaming directories</Text>
        </View>
        {onClose && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={styles.closeBtn}
          >
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarWrapper}>
        <Search size={15} color="rgba(255, 255, 255, 0.4)" style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search portals or categories..."
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
        {search ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSearch('')}
            style={styles.clearBtn}
          >
            <X size={13} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {categories.map((cat) => {
          const Icon = cat.icon
          const isActive = activeCategory === cat.id
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.75}
              onPress={() => setActiveCategory(cat.id)}
              style={[
                styles.categoryChip,
                isActive && styles.categoryChipActive,
              ]}
            >
              <Icon
                size={13}
                color={isActive ? '#06070a' : 'rgba(255, 255, 255, 0.7)'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.categoryText,
                  isActive && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Portals List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.portalsList}
      >
        {filtered.map((portal) => {
          const isCurrent = currentUrl.includes(portal.id) || currentUrl === portal.url
          const domain = portal.url.replace(/^https?:\/\//, '')
          const initial = portal.name.slice(0, 2).toUpperCase()
          const accentColor = portal.accentColor || '#38bdf8'

          return (
            <TouchableOpacity
              key={portal.id}
              activeOpacity={0.75}
              onPress={() => onSelectPortal(portal.url)}
              style={styles.cardTouchable}
            >
              <LiquidGlassContainer
                type="rounded"
                borderRadius={16}
                variant="card"
                style={[styles.portalCard, isCurrent && { borderColor: `${accentColor}60` }]}
              >
                <View style={styles.portalInner}>
                  {/* Monogram Icon */}
                  <View style={[styles.monogramBox, { backgroundColor: `${accentColor}18` }]}>
                    <Text style={[styles.monogramText, { color: accentColor }]}>
                      {initial}
                    </Text>
                  </View>

                  {/* Main Info */}
                  <View style={styles.portalMainCol}>
                    <View style={styles.portalHeaderRow}>
                      <Text style={styles.portalName}>{portal.name}</Text>
                      {portal.badge && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{portal.badge}</Text>
                        </View>
                      )}
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <CheckCircle2 size={10} color="#10b981" />
                          <Text style={styles.currentText}>Active</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.portalDomain}>{domain}</Text>

                    <Text style={styles.portalTagline} numberOfLines={2}>
                      {portal.tagline}
                    </Text>
                  </View>

                  <ChevronRight size={16} color="rgba(255, 255, 255, 0.35)" />
                </View>
              </LiquidGlassContainer>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090e',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  modalHeaderCol: {
    flex: 1,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  modalSub: {
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
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  categoryText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#06070a',
    fontWeight: '700',
  },
  portalsList: {
    paddingBottom: 36,
    gap: 10,
  },
  cardTouchable: {
    width: '100%',
  },
  portalCard: {
    width: '100%',
  },
  portalInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  monogramBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontSize: 16,
    fontWeight: '800',
  },
  portalMainCol: {
    flex: 1,
  },
  portalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  portalName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  categoryBadgeText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    fontWeight: '600',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    gap: 3,
  },
  currentText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  portalDomain: {
    color: 'rgba(255, 255, 255, 0.40)',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  portalTagline: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    lineHeight: 16,
  },
})
