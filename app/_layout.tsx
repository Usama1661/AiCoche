import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppThemeProvider, useAppTheme } from '@/src/theme/ThemeProvider';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function NavBridge({ children }: { children: React.ReactNode }) {
  const { isDark, colors } = useAppTheme();
  const nav = isDark ? DarkTheme : DefaultTheme;
  const merged = {
    ...nav,
    colors: {
      ...nav.colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };
  return <NavThemeProvider value={merged}>{children}</NavThemeProvider>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <NavBridge>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="cv-upload"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen name="cv-analysis" />
            <Stack.Screen
              name="professional-profile"
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="interview-session"
              options={{ presentation: 'fullScreenModal' }}
            />
          </Stack>
        </NavBridge>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
