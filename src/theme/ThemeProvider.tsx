import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';

import { darkColors, lightColors, type ColorPalette } from '@/src/theme/tokens';

const STORAGE_KEY = '@aicoche/theme-preference';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  colors: ColorPalette;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveIsDark(pref: ThemePreference, system: 'light' | 'dark' | null | undefined): boolean {
  if (pref === 'system') {
    return system !== 'light';
  }
  return pref === 'dark';
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (
          !cancelled &&
          (raw === 'light' || raw === 'dark' || raw === 'system')
        ) {
          setPreferenceState(raw);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const isDark = resolveIsDark(preference, system);

  const toggle = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    setPreference(next);
  }, [isDark, setPreference]);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = isDark ? darkColors : lightColors;
    return {
      colors,
      isDark,
      preference,
      setPreference,
      toggle,
    };
  }, [isDark, preference, setPreference, toggle]);

  if (!hydrated) {
    const colors = resolveIsDark('dark', system) ? darkColors : lightColors;
    return (
      <ThemeContext.Provider
        value={{
          colors,
          isDark: resolveIsDark('dark', system),
          preference: 'dark',
          setPreference,
          toggle,
        }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return ctx;
}

/** Sync React Navigation theme with app chrome when using system appearance elsewhere */
export function useNavThemeColors() {
  const { isDark, colors } = useAppTheme();
  return { dark: isDark, colors };
}
