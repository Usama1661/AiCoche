import { StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

type Props = {
  step: number;
  total: number;
  label?: string;
};

export function ProgressHeader({ step, total, label }: Props) {
  const { colors } = useAppTheme();
  const pct = Math.min(100, Math.round(((step + 1) / total) * 100));

  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="caption" muted style={{ marginBottom: spacing.sm }}>
          {label}
        </AppText>
      ) : null}
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>
      <AppText variant="caption" muted style={{ marginTop: spacing.xs }}>
        Step {step + 1} of {total}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  track: {
    height: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
