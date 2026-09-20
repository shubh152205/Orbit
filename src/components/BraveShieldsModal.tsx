import React, { useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
  Platform,
} from 'react-native'
import {
  Shield,
  ShieldCheck,
  Lock,
  Layers,
  Sparkles,
  X,
  Zap,
  EyeOff,
  Cpu,
  Tv,
} from 'lucide-react-native'
import { THEME } from '../theme/tokens'
import { LiquidGlassContainer, LiquidGlassButton } from './LiquidGlass'

interface BraveShieldsModalProps {
  visible: boolean
  onClose: () => void
  currentUrl: string
  blockedCount: number
  shieldsEnabled: boolean
  onToggleShields: () => void
}

export function BraveShieldsModal({
  visible,
  onClose,
  currentUrl,
  blockedCount,
  shieldsEnabled,
  onToggleShields,
}: BraveShieldsModalProps) {
  const [blockTrackers, setBlockTrackers] = useState(true)
  const [cosmeticFiltering, setCosmeticFiltering] = useState(true)
  const [blockPopups, setBlockPopups] = useState(true)
  const [antiAdblockBypass, setAntiAdblockBypass] = useState(true)

  const host = currentUrl.replace(/^https?:\/\//, '').split('/')[0] || 'Current Site'
  const isHttps = currentUrl.startsWith('https://')

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LiquidGlassContainer type="rounded" variant="card" style={styles.container}>
          <View style={styles.dialogInner}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View
                  style={[
                    styles.shieldIconBox,
                    shieldsEnabled ? styles.shieldActiveBox : styles.shieldInactiveBox,
                  ]}
                >
                  <ShieldCheck
                    size={18}
                    color={shieldsEnabled ? '#10b981' : '#64748b'}
                  />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Privacy Shields</Text>
                  <View style={styles.hostRow}>
                    {isHttps && <Lock size={10} color="#10b981" style={{ marginRight: 4 }} />}
                    <Text style={styles.hostText} numberOfLines={1}>
                      {host}
                    </Text>
                  </View>
                </View>
              </View>

              <LiquidGlassButton
                type="circle"
                size={30}
                onPress={onClose}
              >
                <X size={15} color="#94a3b8" />
              </LiquidGlassButton>
            </View>

            {/* Master Shield Toggle Banner */}
            <View
              style={[
                styles.masterCard,
                shieldsEnabled ? styles.masterCardActive : styles.masterCardInactive,
              ]}
            >
              <View style={styles.masterInfo}>
                <View style={styles.masterBadgeRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: shieldsEnabled ? '#10b981' : '#64748b' },
                    ]}
                  />
                  <Text style={styles.masterStatusBadge}>
                    {shieldsEnabled ? 'PROTECTION ACTIVE' : 'PROTECTION PAUSED'}
                  </Text>
                </View>
                <Text style={styles.masterTitle}>
                  {shieldsEnabled ? 'Shields Up' : 'Shields Paused'}
                </Text>
                <Text style={styles.masterDesc}>
                  {shieldsEnabled
                    ? 'Trackers, popups, and invasive video ads are blocked on this site.'
                    : 'Protections are paused. Video ads and popups may occur.'}
                </Text>
              </View>
              <Switch
                value={shieldsEnabled}
                onValueChange={onToggleShields}
                trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(16, 185, 129, 0.45)' }}
                thumbColor={shieldsEnabled ? '#10b981' : '#64748b'}
              />
            </View>

            {/* Live Blocked Stats Display */}
            <View style={styles.statsCard}>
              <View style={styles.statCol}>
                <Text style={styles.statNumber}>{shieldsEnabled ? blockedCount : 0}</Text>
                <Text style={styles.statLabel}>Trackers Blocked</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statNumberEst}>
                  {shieldsEnabled ? `${(blockedCount * 0.45).toFixed(1)} MB` : '0.0 MB'}
                </Text>
                <Text style={styles.statLabel}>Data Saved</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statNumberEst}>
                  {shieldsEnabled ? `${(blockedCount * 0.12).toFixed(1)}s` : '0.0s'}
                </Text>
                <Text style={styles.statLabel}>Time Saved</Text>
              </View>
            </View>

            {/* Native Brave & AdGuard JNI Engine Status */}
            <View style={styles.engineCard}>
              <View style={styles.engineHeader}>
                <View style={styles.enginePill}>
                  <Cpu size={12} color="#10b981" />
                  <Text style={styles.enginePillText}>BRAVE & ADGUARD JNI CORE</Text>
                </View>
                <View style={styles.engineStatusDotRow}>
                  <View style={[styles.enginePulseDot, { backgroundColor: shieldsEnabled ? '#10b981' : '#64748b' }]} />
                  <Text style={styles.engineStatusText}>
                    {shieldsEnabled ? 'Intercepting OS Network' : 'Engine Idle'}
                  </Text>
                </View>
              </View>
              <Text style={styles.engineDetailsText}>
                compiled rule set • empty WebResourceResponse on match • CSS cosmetic injection active
              </Text>
            </View>

            {/* Detailed Protection Toggles List */}
            <View style={styles.togglesList}>
              <View style={styles.toggleItem}>
                <View style={styles.toggleTextCol}>
                  <View style={styles.toggleTitleRow}>
                    <ShieldCheck size={14} color="#38bdf8" />
                    <Text style={styles.toggleTitle}>Block Ads & Popups</Text>
                  </View>
                  <Text style={styles.toggleDesc}>
                    Prevents rogue betting redirects & popunder tabs
                  </Text>
                </View>
                <Switch
                  value={blockPopups && shieldsEnabled}
                  onValueChange={(val) => setBlockPopups(val)}
                  disabled={!shieldsEnabled}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(56, 189, 248, 0.45)' }}
                  thumbColor={blockPopups && shieldsEnabled ? '#38bdf8' : '#64748b'}
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleTextCol}>
                  <View style={styles.toggleTitleRow}>
                    <Tv size={14} color="#38bdf8" />
                    <Text style={styles.toggleTitle}>Block Clickjackers & Overlays</Text>
                  </View>
                  <Text style={styles.toggleDesc}>
                    Strips invisible click hijackers over media players
                  </Text>
                </View>
                <Switch
                  value={cosmeticFiltering && shieldsEnabled}
                  onValueChange={(val) => setCosmeticFiltering(val)}
                  disabled={!shieldsEnabled}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(56, 189, 248, 0.45)' }}
                  thumbColor={cosmeticFiltering && shieldsEnabled ? '#38bdf8' : '#64748b'}
                />
              </View>

              <View style={[styles.toggleItem, { borderBottomWidth: 0 }]}>
                <View style={styles.toggleTextCol}>
                  <View style={styles.toggleTitleRow}>
                    <Zap size={14} color="#10b981" />
                    <Text style={styles.toggleTitle}>Anti-Adblock Bypass</Text>
                  </View>
                  <Text style={styles.toggleDesc}>
                    Neutralizes detector scripts to maintain video streaming
                  </Text>
                </View>
                <Switch
                  value={antiAdblockBypass && shieldsEnabled}
                  onValueChange={(val) => setAntiAdblockBypass(val)}
                  disabled={!shieldsEnabled}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: 'rgba(16, 185, 129, 0.45)' }}
                  thumbColor={antiAdblockBypass && shieldsEnabled ? '#10b981' : '#64748b'}
                />
              </View>
            </View>

            {/* Done Action Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              style={styles.doneBtn}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </LiquidGlassContainer>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
  },
  dialogInner: {
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shieldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shieldActiveBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  shieldInactiveBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  hostText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  masterCardActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  masterCardInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  masterInfo: {
    flex: 1,
    marginRight: 10,
  },
  masterBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  masterStatusBadge: {
    color: '#94a3b8',
    fontSize: 8.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  masterTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  masterDesc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    marginBottom: 14,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statNumberEst: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 9.5,
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  engineCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.18)',
    padding: 10,
    marginBottom: 12,
  },
  engineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  enginePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  enginePillText: {
    color: '#10b981',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  engineStatusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  enginePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  engineStatusText: {
    color: '#94a3b8',
    fontSize: 9.5,
    fontWeight: '600',
  },
  engineDetailsText: {
    color: '#64748b',
    fontSize: 9,
    lineHeight: 12,
  },
  togglesList: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  toggleTextCol: {
    flex: 1,
    marginRight: 10,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  toggleTitle: {
    color: '#f8fafc',
    fontSize: 12.5,
    fontWeight: '600',
  },
  toggleDesc: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 13,
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 9,
    paddingVertical: 9,
  },
  doneBtnText: {
    color: '#06070a',
    fontSize: 13,
    fontWeight: '700',
  },
})
