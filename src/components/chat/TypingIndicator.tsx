import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

function Dot({ delay }: { delay: number }) {
  const { colors } = useAppTheme();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 320 }),
          withTiming(0, { duration: 320 })
        ),
        -1,
        false
      )
    );
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * t.value,
    transform: [{ translateY: -4 * t.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: radii.pill,
          backgroundColor: colors.textMuted,
        },
        style,
      ]}
    />
  );
}

export function TypingIndicator() {
  return (
    <View style={styles.row}>
      <Dot delay={0} />
      <Dot delay={120} />
      <Dot delay={240} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
});
