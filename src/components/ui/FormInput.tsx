import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { HapticPressable as Pressable } from '@/src/components/ui/HapticPressable';
import { triggerLightHaptic } from '@/src/lib/haptics';
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
  const inputRef = useRef<TextInput>(null);

  function focusInput() {
    triggerLightHaptic();
    inputRef.current?.focus();
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <AppText variant="caption" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <Pressable
        haptic={false}
        onPress={focusInput}
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
          ref={inputRef}
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
      </Pressable>
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
