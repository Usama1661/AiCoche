import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAppStoresHydrated } from '@/src/hooks/useHydration';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { useProfileStore } from '@/src/store/profileStore';
import { useSessionStore } from '@/src/store/sessionStore';

export default function Index() {
  const hydrated = useAppStoresHydrated();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const hasSeenAuthSplash = useSessionStore((s) => s.hasSeenAuthSplash);
  const onboardingComplete = useProfileStore((s) => s.onboardingComplete);
  const { colors } = useAppTheme();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    if (!hasSeenAuthSplash) {
      return <Redirect href="/(auth)/splash" />;
    }
    return <Redirect href="/(auth)/login" />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
