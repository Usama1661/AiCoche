import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii } from '@/src/theme/tokens';

type Props = {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
};

export function Skeleton({ height = 14, width = '100%', radius = radii.sm }: Props) {
  const { colors } = useAppTheme();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        style,
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: colors.border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
