import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import {
  addInterviewReminderReceivedListener,
  addInterviewReminderResponseListener,
  getLastInterviewReminderResponse,
  INTERVIEW_REMINDER_ROUTE,
} from '@/src/lib/notifications';
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

function NotificationRouteHandler() {
  const router = useRouter();
  const handledInitialResponse = useRef(false);

  useEffect(() => {
    const openInterviewReminder = () => {
      requestAnimationFrame(() => {
        router.push(INTERVIEW_REMINDER_ROUTE as never);
      });
    };

    const subscription = addInterviewReminderResponseListener(openInterviewReminder);
    const receivedSubscription = addInterviewReminderReceivedListener(({ title, body }) => {
      Alert.alert(title, body, [
        { text: 'Later', style: 'cancel' },
        { text: 'Start now', onPress: openInterviewReminder },
      ]);
    });

    if (!handledInitialResponse.current) {
      handledInitialResponse.current = true;
      getLastInterviewReminderResponse().then((response) => {
        if (response) openInterviewReminder();
      });
    }

    return () => {
      subscription.remove();
      receivedSubscription.remove();
    };
  }, [router]);

  return null;
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
          <NotificationRouteHandler />
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
            <Stack.Screen name="privacy-security" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="privacy-policy" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="help-support" options={{ animation: 'slide_from_right' }} />
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
