import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
  Platform,
  Alert,
} from 'react-native'
import {
  Settings,
  Shield,
  Monitor,
  HardDrive,
  Trash2,
  X,
  CheckCircle2,
  Tv,
  PictureInPicture2,
  Lock,
  ChevronRight,
} from 'lucide-react-native'
import { THEME } from '../theme/tokens'
import { LiquidGlassContainer, LiquidGlassButton } from './LiquidGlass'

interface NativeSettingsModalProps {
  visible: boolean
  onClose: () => void
  isDesktopMode: boolean
  onToggleDesktopMode: () => void
  hasStoragePermission: boolean
  onRequestStoragePermission: () => void
  onClearHistory: () => void
  shieldsEnabled?: boolean
  onToggleShields?: () => void
  backgroundPlayEnabled?: boolean
  onToggleBackgroundPlay?: () => void
  autoPipEnabled?: boolean
  onToggleAutoPip?: () => void
}

export function NativeSettingsModal({
  visible,
  onClose,
  isDesktopMode,
  onToggleDesktopMode,
  hasStoragePermission,
  onRequestStoragePermission,
  onClearHistory,
  shieldsEnabled = true,
  onToggleShields,
  backgroundPlayEnabled = true,
  onToggleBackgroundPlay,
  autoPipEnabled = true,
  onToggleAutoPip,
}: NativeSettingsModalProps) {
  const handleClearHistory = () => {
    Alert.alert(
      'Clear Browsing History',
      'Are you sure you want to clear your recent stream directory history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: onClearHistory,
        },
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <LiquidGlassContainer type="rounded" variant="card" style={styles.modalCard}>
          <View style={styles.cardInner}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View style={styles.iconBox}>
                  <Settings size={15} color="#f8fafc" />
                </View>
                <Text style={styles.title}>Settings</Text>
              </View>
              <LiquidGlassButton
                type="circle"
                size={30}
                onPress={onClose}
              >
                <X size={15} color="#94a3b8" />
              </LiquidGlassButton>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Section 1: Storage & Permissions */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>STORAGE & DOWNLOADS</Text>
                <View style={styles.groupedTable}>
                  <View style={styles.tableRow}>
                    <View style={styles.rowLeading}>
                      <View style={[styles.symbolBox, { backgroundColor: '#0284c7' }]}>
                        <HardDrive size={13} color="#ffffff" />
                      </View>
                      <View style={styles.textColumn}>
                        <Text style={styles.rowTitle}>Device File Storage</Text>
                        <Text style={styles.rowSubtitle}>
                          Required to save offline video streams
                        </Text>
                      </View>
                    </View>
                    {hasStoragePermission ? (
                      <View style={styles.grantedBadge}>
                        <CheckCircle2 size={12} color="#10b981" style={{ marginRight: 4 }} />
                        <Text style={styles.grantedText}>Granted</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={onRequestStoragePermission}
                        style={styles.grantBtn}
                      >
                        <Text style={styles.grantBtnText}>Grant</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Section 2: Privacy & Shields */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>PRIVACY & USER AGENT</Text>
                <View style={styles.groupedTable}>
                  <View style={styles.tableRow}>
                    <View style={styles.rowLeading}>
                      <View style={[styles.symbolBox, { backgroundColor: '#10b981' }]}>
                        <Shield size={13} color="#ffffff" />
                      </View>
                      <View style={styles.textColumn}>
                        <Text style={styles.rowTitle}>Privacy Shield</Text>
                        <Text style={styles.rowSubtitle}>
                          Block trackers, popups, and invasive ads
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={shieldsEnabled}
                      onValueChange={onToggleShields}
                      trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(16, 185, 129, 0.45)' }}
                      thumbColor={shieldsEnabled ? '#10b981' : '#64748b'}
                    />
                  </View>

                  <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.rowLeading}>
                      <View style={[styles.symbolBox, { backgroundColor: '#6366f1' }]}>
                        <Monitor size={13} color="#ffffff" />
                      </View>
                      <View style={styles.textColumn}>
                        <Text style={styles.rowTitle}>Request Desktop Site</Text>
                        <Text style={styles.rowSubtitle}>
                          Emulate desktop browser user-agent
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={isDesktopMode}
                      onValueChange={onToggleDesktopMode}
                      trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(129, 140, 248, 0.45)' }}
                      thumbColor={isDesktopMode ? '#818cf8' : '#64748b'}
                    />
                  </View>
                </View>
              </View>

              {/* Section 3: Cinema & Streaming Engine */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>CINEMA & STREAMING</Text>
                <View style={styles.groupedTable}>
                  <View style={styles.tableRow}>
                    <View style={styles.rowLeading}>
                      <View style={[styles.symbolBox, { backgroundColor: '#38bdf8' }]}>
                        <Tv size={13} color="#ffffff" />
                      </View>
                      <View style={styles.textColumn}>
                        <Text style={styles.rowTitle}>Background Play</Text>
                        <Text style={styles.rowSubtitle}>
                          Keep audio streaming when app closes (Soul/Brave)
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={backgroundPlayEnabled}
                      onValueChange={onToggleBackgroundPlay}
                      trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(56, 189, 248, 0.45)' }}
                      thumbColor={backgroundPlayEnabled ? '#38bdf8' : '#64748b'}
                    />
                  </View>

                  <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.rowLeading}>
                      <View style={[styles.symbolBox, { backgroundColor: '#e11d48' }]}>
                        <PictureInPicture2 size={13} color="#ffffff" />
                      </View>
                      <View style={styles.textColumn}>
                        <Text style={styles.rowTitle}>YouTube-Style PiP</Text>
                        <Text style={styles.rowSubtitle}>
                          Auto-transition to system floating window on home
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={autoPipEnabled}
                      onValueChange={onToggleAutoPip}
                      trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(225, 29, 72, 0.45)' }}
                      thumbColor={autoPipEnabled ? '#e11d48' : '#64748b'}
                    />
                  </View>
                </View>
              </View>

              {/* Section 4: Data Management */}
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>DATA & HISTORY</Text>
                <View style={styles.groupedTable}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={handleClearHistory}
                    style={[styles.tableRow, { borderBottomWidth: 0 }]}
                  >
                    <View style={styles.rowLeading}>
                      <View style={[styles.symbolBox, { backgroundColor: '#f43f5e' }]}>
                        <Trash2 size={14} color="#fff" />
                      </View>
                      <View style={styles.textColumn}>
                        <Text style={[styles.rowTitle, { color: '#f43f5e' }]}>
                          Clear Browsing History
                        </Text>
                        <Text style={styles.rowSubtitle}>
                          Wipe cached portals and recent addresses
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </LiquidGlassContainer>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
  },
  cardInner: {
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  groupedTable: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  rowLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  symbolBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textColumn: {
    flex: 1,
  },
  rowTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#64748b',
    fontSize: 10.5,
    marginTop: 2,
    lineHeight: 14,
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  grantedText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  grantBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  grantBtnText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
})
