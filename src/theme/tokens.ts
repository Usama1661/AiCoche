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
  pill: 999,
} as const;

export type ColorPalette = {
  background: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryMuted: string;
  success: string;
  error: string;
  overlay: string;
  aiBubble: string;
  userBubble: string;
};

export const darkColors: ColorPalette = {
  background: '#0B1220',
  surface: '#1B2638',
  card: '#1B2638',
  border: '#334155',
  text: '#F1F5F9',
  textMuted: '#9AA7BA',
  textInverse: '#0F172A',
  primary: '#4F46E5',
  primaryMuted: '#6366F1',
  success: '#22C55E',
  error: '#EF4444',
  overlay: 'rgba(15, 23, 42, 0.85)',
  aiBubble: '#334155',
  userBubble: '#312E81',
};

export const lightColors: ColorPalette = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textInverse: '#F8FAFC',
  primary: '#4F46E5',
  primaryMuted: '#6366F1',
  success: '#16A34A',
  error: '#DC2626',
  overlay: 'rgba(248, 250, 252, 0.92)',
  aiBubble: '#E2E8F0',
  userBubble: '#C7D2FE',
};

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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }) as ViewStyle;
}
