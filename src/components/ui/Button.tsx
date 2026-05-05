import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { gradients, motion, radii, spacing } from '@/src/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  leftIcon?: ReactNode;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  leftIcon,
  style,
}: Props) {
  const { colors } = useAppTheme();
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  const border =
    variant === 'secondary' || (isPrimary && isDisabled)
      ? { borderWidth: 1, borderColor: colors.border }
      : {};

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? colors.textInverse
      : variant === 'secondary'
        ? colors.primary
        : colors.primary;

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <>
      {leftIcon}
      <AppText variant="subtitle" style={{ color: textColor }}>
        {title}
      </AppText>
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor:
            variant === 'secondary'
              ? colors.card
              : variant === 'danger'
                ? colors.error
                : isPrimary && isDisabled
                  ? colors.border
                  : isPrimary
                    ? 'transparent'
                    : 'transparent',
          opacity: isDisabled ? 0.55 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !isDisabled ? motion.pressScale : 1 }],
        },
        border,
        style,
      ]}>
      {isPrimary && !isDisabled ? (
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      <View style={styles.content}>{content}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  content: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
