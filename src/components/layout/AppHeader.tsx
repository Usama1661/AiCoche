import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
};

export function AppHeader({ title, subtitle, onBack, right }: Props) {
  const { colors, toggle, isDark } = useAppTheme();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button">
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <AppText variant="title">{title}</AppText>
          {subtitle ? (
            <AppText variant="caption" muted>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        {right}
        <Pressable
          onPress={toggle}
          hitSlop={8}
          accessibilityLabel="Toggle theme"
          accessibilityRole="button">
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
