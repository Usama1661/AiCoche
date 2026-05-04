import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/src/theme/ThemeProvider';
import { cardShadow, radii, spacing } from '@/src/theme/tokens';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

export function Card({ children, onPress, style, padded = true }: Props) {
  const { colors } = useAppTheme();
  const baseStyle: ViewStyle[] = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    cardShadow(colors.background),
    padded ? { padding: spacing.lg } : null,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...baseStyle, pressed && { opacity: 0.92 }]}
        accessibilityRole="button">
        {children}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
  },
});
