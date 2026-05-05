import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

type Tone = 'success' | 'error' | 'neutral' | 'primary';

type Props = { label: string; tone?: Tone };

export function Badge({ label, tone = 'neutral' }: Props) {
  const { colors } = useAppTheme();
  const bg =
    tone === 'success'
      ? colors.successTint
      : tone === 'error'
        ? colors.errorTint
        : tone === 'primary'
          ? colors.primaryTint
          : colors.surface;
  const fg =
    tone === 'success'
      ? colors.success
      : tone === 'error'
        ? colors.error
        : tone === 'primary'
          ? colors.primary
          : colors.text;

  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <AppText variant="caption" style={{ color: fg, fontWeight: '600' }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
});
