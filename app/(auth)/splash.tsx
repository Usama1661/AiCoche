import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { useSessionStore } from '@/src/store/sessionStore';
import { spacing } from '@/src/theme/tokens';

export default function SplashScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const setHasSeenAuthSplash = useSessionStore((s) => s.setHasSeenAuthSplash);

  useEffect(() => {
    const t = setTimeout(() => {
      setHasSeenAuthSplash(true);
      router.replace('/(auth)/login');
    }, 1500);
    return () => clearTimeout(t);
  }, [router, setHasSeenAuthSplash]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.center}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]} />
        <AppText variant="display" style={{ marginTop: spacing.xl }}>
          AiCoche
        </AppText>
        <AppText variant="body" muted style={{ marginTop: spacing.sm }}>
          Your AI Career Coach
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  center: { alignItems: 'center' },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
});
