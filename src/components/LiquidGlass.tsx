import React from 'react'
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native'
import { BlurView } from 'expo-blur'
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg'
import { THEME } from '../theme/tokens'

export type LiquidShapeType = 'pill' | 'circle' | 'rounded'

export interface LiquidGlassContainerProps {
  type?: LiquidShapeType
  borderRadius?: number
  edgeIntensity?: number
  rimIntensity?: number
  blurRadius?: number
  tintOpacity?: number
  warp?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  children?: React.ReactNode
  variant?: 'surface' | 'raised' | 'floating' | 'card'
  glowColor?: string
}

/**
 * LiquidGlassContainer
 * Pure Apple / iPhone Liquid Glass design.
 * 
 * Features:
 * - Silky frosted glass with true optical translucency
 * - Single razor-thin luminous perimeter (1px rgba(255,255,255,0.35))
 * - Signature curved organic liquid light gleam across the surface
 * - Soft diffuse ambient elevation shadow
 * - Clean card variant for modals and lists
 */
export function LiquidGlassContainer({
  type = 'rounded',
  borderRadius,
  style,
  contentStyle,
  children,
  variant = 'surface',
  glowColor,
}: LiquidGlassContainerProps) {
  const isFloating = variant === 'floating' || variant === 'raised'
  const isCard = variant === 'card' || variant === 'surface'

  const shapeStyle =
    type === 'circle'
      ? styles.circleShape
      : type === 'pill'
      ? styles.pillShape
      : styles.roundedShape

  const customRadius =
    borderRadius !== undefined && type === 'rounded' ? { borderRadius } : null

  // Unique SVG gradient ID per container instance
  const gradId = React.useId
    ? React.useId().replace(/:/g, '')
    : `glass-${Math.random().toString(36).substring(2, 8)}`

  // 1. Clean Apple Frosted Glass Card for Lists & Modals
  if (isCard) {
    return (
      <View
        style={[
          styles.cardWrapper,
          shapeStyle,
          customRadius,
          glowColor ? { borderColor: glowColor } : null,
          style,
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 30 : 20}
          tint="dark"
          style={[StyleSheet.absoluteFillObject, shapeStyle, customRadius]}
        />
        <View style={[styles.contentLayer, contentStyle]}>
          {children}
        </View>
      </View>
    )
  }

  // 2. Floating Liquid Glass Capsule / Circle (Exact match to iPhone Liquid Glass reference)
  return (
    <View
      style={[
        styles.floatingShadowWrapper,
        shapeStyle,
        customRadius,
        style,
      ]}
    >
      <View
        style={[
          styles.floatingGlassBody,
          shapeStyle,
          customRadius,
          glowColor ? { borderColor: glowColor } : null,
        ]}
      >
        {/* Hardware-Accelerated Frosted Blur */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 50 : 35}
          tint="dark"
          style={[StyleSheet.absoluteFillObject, shapeStyle, customRadius]}
        />

        {/* Liquid Glass Organic Gleam & Curved Light Sheen */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            shapeStyle,
            customRadius,
            { overflow: 'hidden' },
          ]}
        >
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
            <Defs>
              {/* Subtle top rim light sheen */}
              <LinearGradient id={`top-sheen-${gradId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                <Stop offset="30%" stopColor="#ffffff" stopOpacity="0.06" />
                <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </LinearGradient>

              {/* Signature organic curved specular reflection (curved liquid gleam on right side) */}
              <RadialGradient id={`liquid-gleam-${gradId}`} cx="74%" cy="22%" r="48%" fx="74%" fy="22%">
                <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                <Stop offset="45%" stopColor="#ffffff" stopOpacity="0.10" />
                <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#top-sheen-${gradId})`} />
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#liquid-gleam-${gradId})`} />
          </Svg>
        </View>

        {/* Content Layer */}
        <View style={[styles.contentLayer, contentStyle]}>
          {children}
        </View>
      </View>
    </View>
  )
}

export interface LiquidGlassButtonProps {
  type?: LiquidShapeType
  size?: number
  onPress?: () => void
  active?: boolean
  activeColor?: string
  style?: StyleProp<ViewStyle>
  children?: React.ReactNode
  disabled?: boolean
  accessibilityLabel?: string
}

/**
 * LiquidGlassButton
 * Clean, translucent liquid glass button matching the iPhone Liquid Glass aesthetic.
 */
export function LiquidGlassButton({
  type = 'circle',
  size = 36,
  onPress,
  active = false,
  activeColor = THEME.colors.accent,
  style,
  children,
  disabled = false,
  accessibilityLabel,
}: LiquidGlassButtonProps) {
  const isCircle = type === 'circle'
  const isPill = type === 'pill'

  const dynamicDimensions: ViewStyle = isCircle
    ? { width: size, height: size, borderRadius: size / 2 }
    : isPill
    ? { height: size, borderRadius: size / 2, paddingHorizontal: Math.round(size * 0.35) }
    : { height: size, borderRadius: 12, paddingHorizontal: Math.round(size * 0.28) }

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.glassButton,
        dynamicDimensions,
        {
          borderColor: active ? activeColor : 'rgba(255, 255, 255, 0.28)',
          backgroundColor: active ? `${activeColor}25` : 'rgba(255, 255, 255, 0.08)',
        },
        active && {
          shadowColor: activeColor,
          shadowOpacity: 0.45,
          shadowRadius: 8,
        },
        disabled && styles.disabledBtn,
        style,
      ]}
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 25 : 15}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.buttonContent}>{children}</View>
    </TouchableOpacity>
  )
}

/**
 * LiquidGlassBadge
 * Translucent badge capsule with clean glass tint.
 */
export function LiquidGlassBadge({
  children,
  style,
  accentColor,
}: {
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
  accentColor?: string
}) {
  return (
    <View
      style={[
        styles.badgeWrapper,
        accentColor ? { borderColor: `${accentColor}50` } : null,
        style,
      ]}
    >
      <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: accentColor
              ? `${accentColor}18`
              : 'rgba(255, 255, 255, 0.08)',
          },
        ]}
      />
      <View style={styles.badgeContent}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  // Clean Apple Glass Card for lists and modals
  cardWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  // Floating Liquid Glass Capsule (iPhone Liquid Glass from reference image)
  floatingShadowWrapper: {
    position: 'relative',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  floatingGlassBody: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    width: '100%',
  },
  contentLayer: {
    width: '100%',
    zIndex: 2,
  },
  pillShape: {
    borderRadius: 9999,
  },
  circleShape: {
    aspectRatio: 1,
    borderRadius: 9999,
  },
  roundedShape: {
    borderRadius: 22,
  },
  glassButton: {
    position: 'relative',
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  disabledBtn: {
    opacity: 0.35,
  },
  badgeWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContent: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
})
