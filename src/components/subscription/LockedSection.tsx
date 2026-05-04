import type { ReactNode } from 'react';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

type Props = {
  children: ReactNode;
  onUpgrade: () => void;
  title?: string;
  locked: boolean;
};

export function LockedSection({
  children,
  onUpgrade,
  title = 'Pro feature',
  locked,
}: Props) {
  const { colors, isDark } = useAppTheme();

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrap}>
      {children}
      <BlurView
        intensity={isDark ? 45 : 65}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}>
        <Pressable style={styles.overlay} onPress={onUpgrade}>
          <AppText variant="subtitle" style={{ color: colors.text }}>
            {title}
          </AppText>
          <AppText variant="caption" muted style={{ textAlign: 'center', marginTop: spacing.xs }}>
            Upgrade to unlock downloads and unlimited usage.
          </AppText>
          <View style={[styles.cta, { backgroundColor: colors.primary }]}>
            <AppText variant="caption" style={{ color: '#fff', fontWeight: '700' }}>
              Upgrade to Pro
            </AppText>
          </View>
        </Pressable>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'hidden', borderRadius: radii.lg },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  cta: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
});
