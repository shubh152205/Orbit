import { Platform } from 'react-native'

/**
 * StreamNest Anti-Slop Design Tokens
 * Aesthetic Archetype: Dark Precision / Machined Ethereal Glass
 * Supports both Dark and Light appearance modes
 */

export const darkColors = {
  // Canvas & Surfaces
  canvas: '#06070a',
  canvasElevated: '#0b0d14',
  surfaceOuter: 'rgba(255, 255, 255, 0.04)',
  surfaceInner: 'rgba(15, 18, 28, 0.82)',
  surfaceCard: 'rgba(18, 22, 34, 0.78)',
  surfaceRaised: 'rgba(255, 255, 255, 0.08)',
  surfaceGlass: 'rgba(15, 18, 28, 0.72)',
  surfaceHover: 'rgba(255, 255, 255, 0.08)',
  surfaceActive: 'rgba(255, 255, 255, 0.12)',

  // Hairlines & Borders (Doppelrand nesting)
  borderSubtle: 'rgba(255, 255, 255, 0.07)',
  borderMedium: 'rgba(255, 255, 255, 0.13)',
  borderStrong: 'rgba(255, 255, 255, 0.22)',
  borderActive: 'rgba(56, 189, 248, 0.45)',
  hairlineLight: 'rgba(255, 255, 255, 0.08)',
  hairlineMedium: 'rgba(255, 255, 255, 0.14)',
  hairlineStrong: 'rgba(255, 255, 255, 0.22)',

  // Liquid Glass Specular & Rim
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  glassRim: 'rgba(255, 255, 255, 0.35)',
  glassTint: 'rgba(12, 16, 28, 0.72)',
  glassSheen: 'rgba(255, 255, 255, 0.08)',

  // Typography
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textDisabled: '#475569',

  // Calibrated Accents
  accent: '#38bdf8', // Electric Sapphire / Cyan
  accentGlow: 'rgba(56, 189, 248, 0.18)',
  accentDark: '#0284c7',

  // Semantic States
  success: '#10b981',
  successGlow: 'rgba(16, 185, 129, 0.18)',
  warning: '#f59e0b',
  warningGlow: 'rgba(245, 158, 11, 0.18)',
  danger: '#f43f5e',
  dangerGlow: 'rgba(244, 63, 94, 0.18)',

  // Shields Specific
  shieldsActive: '#0ea5e9',
  shieldsGlow: 'rgba(14, 165, 233, 0.2)',
} as const

export const lightColors = {
  // Canvas & Surfaces (Crisp, modern daylight aesthetic)
  canvas: '#f1f5f9',
  canvasElevated: '#ffffff',
  surfaceOuter: 'rgba(0, 0, 0, 0.04)',
  surfaceInner: 'rgba(255, 255, 255, 0.94)',
  surfaceCard: '#ffffff',
  surfaceRaised: 'rgba(0, 0, 0, 0.05)',
  surfaceGlass: 'rgba(255, 255, 255, 0.85)',
  surfaceHover: 'rgba(0, 0, 0, 0.04)',
  surfaceActive: 'rgba(0, 0, 0, 0.08)',

  // Hairlines & Borders
  borderSubtle: 'rgba(0, 0, 0, 0.06)',
  borderMedium: 'rgba(0, 0, 0, 0.10)',
  borderStrong: 'rgba(0, 0, 0, 0.18)',
  borderActive: 'rgba(2, 132, 199, 0.45)',
  hairlineLight: 'rgba(0, 0, 0, 0.07)',
  hairlineMedium: 'rgba(0, 0, 0, 0.12)',
  hairlineStrong: 'rgba(0, 0, 0, 0.18)',

  // Liquid Glass Specular & Rim
  glassBorder: 'rgba(0, 0, 0, 0.08)',
  glassRim: 'rgba(255, 255, 255, 0.95)',
  glassTint: 'rgba(255, 255, 255, 0.90)',
  glassSheen: 'rgba(255, 255, 255, 0.40)',

  // Typography
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textDisabled: '#cbd5e1',

  // Calibrated Accents
  accent: '#0284c7', // Crisp Ocean Sapphire
  accentGlow: 'rgba(2, 132, 199, 0.15)',
  accentDark: '#0369a1',

  // Semantic States
  success: '#059669',
  successGlow: 'rgba(5, 150, 105, 0.15)',
  warning: '#d97706',
  warningGlow: 'rgba(217, 119, 6, 0.15)',
  danger: '#e11d48',
  dangerGlow: 'rgba(225, 29, 72, 0.15)',

  // Shields Specific
  shieldsActive: '#0284c7',
  shieldsGlow: 'rgba(2, 132, 199, 0.18)',
} as const

export function getThemeColors(isDark: boolean) {
  return isDark ? darkColors : lightColors
}

const baseRadii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 32,
  outerBezel: 28,
  innerCore: 22,
  full: 9999,
} as const

export const THEME = {
  colors: darkColors,
  radius: baseRadii,
  radii: baseRadii,

  liquidGlass: {
    intensity: 85,
    tintOpacity: 0.25,
    specularRimColor: 'rgba(255, 255, 255, 0.35)',
    specularRimHeight: 1.5,
    border: 'rgba(255, 255, 255, 0.18)',
    surfaceBg: 'rgba(12, 16, 28, 0.72)',
    buttonSheen: 'rgba(255, 255, 255, 0.08)',
    buttonHighlight: 'rgba(255, 255, 255, 0.45)',
  },

  typography: {
    monoFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    captionMono: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 10,
      letterSpacing: 0.5,
    },
    body: {
      fontSize: 13,
      letterSpacing: -0.1,
    },
  },

  shadows: {
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.55,
      shadowRadius: 24,
      elevation: 12,
    },
    glowCyan: {
      shadowColor: '#38bdf8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
  },
} as const
