import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 22,
  pill: 999,
} as const;

export type ColorPalette = {
  background: string;
  surface: string;
  elevated: string;
  card: string;
  border: string;
  borderMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryMuted: string;
  secondaryPink: string;
  accentGold: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  overlay: string;
  aiBubble: string;
  userBubble: string;
  glow: string;
  primaryTint: string;
  successTint: string;
  warningTint: string;
  errorTint: string;
  infoTint: string;
  mutedTint: string;
};

export const darkColors: ColorPalette = {
  background: '#0A0A14',
  surface: '#1A1A2A',
  elevated: '#1A1A2A',
  card: '#13131F',
  border: '#1E1E2E',
  borderMuted: '#2A2A3A',
  text: '#F0F0F5',
  textSecondary: '#9898AC',
  textMuted: '#5C5C72',
  textInverse: '#FFFFFF',
  primary: '#B266FF',
  primaryDark: '#7C3AED',
  primaryLight: '#D4A0FF',
  primaryMuted: '#8B5CF6',
  secondaryPink: '#FF6B9D',
  accentGold: '#FBBF24',
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  overlay: 'rgba(10, 10, 20, 0.82)',
  aiBubble: '#1A1A2A',
  userBubble: '#1E1235',
  glow: 'rgba(178, 102, 255, 0.35)',
  primaryTint: 'rgba(178, 102, 255, 0.16)',
  successTint: 'rgba(74, 222, 128, 0.14)',
  warningTint: 'rgba(251, 191, 36, 0.14)',
  errorTint: 'rgba(248, 113, 113, 0.14)',
  infoTint: 'rgba(96, 165, 250, 0.14)',
  mutedTint: 'rgba(92, 92, 114, 0.18)',
};

export const lightColors: ColorPalette = darkColors;

export const gradients = {
  primary: ['#7C3AED', '#B266FF'] as const,
  hero: ['#1E1235', '#15102A', '#13131F'] as const,
  purpleGlow: ['#7C3AED', '#B266FF', '#FF6B9D'] as const,
  surface: ['#1A1A2A', '#13131F'] as const,
} as const;

export const motion = {
  entranceDuration: 480,
  entranceSlideY: 22,
  pressScale: 0.98,
} as const;

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800' as TextStyle['fontWeight'],
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800' as TextStyle['fontWeight'],
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800' as TextStyle['fontWeight'],
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
  },
};

export function cardShadow(color: string): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
    },
    android: {
      elevation: 3,
    },
    default: {},
  }) as ViewStyle;
}
