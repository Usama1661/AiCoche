import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  Pressable,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
};

export function FormInput({
  label,
  error,
  style,
  onBlur,
  onFocus,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  ...rest
}: Props) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <AppText variant="caption" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : focused ? colors.primary : colors.border,
            shadowColor: focused ? colors.primary : 'transparent',
            shadowOpacity: focused ? 0.25 : 0,
            shadowRadius: focused ? 12 : 0,
          },
        ]}>
        {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }, style]}
        />
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} disabled={!onRightIconPress} style={styles.iconSlot}>
            {rightIcon}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" style={{ color: colors.error }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { marginBottom: 6, fontWeight: '800' },
  inputShell: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
    fontSize: 16,
    fontWeight: '700',
  },
  iconSlot: { alignItems: 'center', justifyContent: 'center' },
});
