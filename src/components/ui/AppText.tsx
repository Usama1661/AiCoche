import type { TextProps } from 'react-native';
import { Text, type TextStyle } from 'react-native';

import { useAppTheme } from '@/src/theme/ThemeProvider';
import { typography } from '@/src/theme/tokens';

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
  color?: string;
};

export function AppText({
  variant = 'body',
  muted,
  color,
  style,
  ...rest
}: Props) {
  const { colors } = useAppTheme();
  const base = typography[variant];
  const textColor = color ?? (muted ? colors.textMuted : colors.text);
  return (
    <Text
      {...rest}
      style={[base as TextStyle, { color: textColor }, style]}
    />
  );
}
