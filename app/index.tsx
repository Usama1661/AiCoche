import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAppStoresHydrated } from '@/src/hooks/useHydration';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { useProfileStore } from '@/src/store/profileStore';
import { useSessionStore } from '@/src/store/sessionStore';

export default function Index() {
  const hydrated = useAppStoresHydrated();
  const refreshSession = useSessionStore((s) => s.refreshSession);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const hasSeenAuthSplash = useSessionStore((s) => s.hasSeenAuthSplash);
  const onboardingComplete = useProfileStore((s) => s.onboardingComplete);
  const { colors } = useAppTheme();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!hydrated) return;

    let mounted = true;
    refreshSession()
      .catch(() => {
        // Auth screens show the actionable error when a user signs in.
      })
      .finally(() => {
        if (mounted) setCheckingSession(false);
      });

    return () => {
      mounted = false;
    };
  }, [hydrated, refreshSession]);

  if (!hydrated || checkingSession) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href={hasSeenAuthSplash ? '/(auth)/login' : '/(auth)/splash'} />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}
