import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { HapticPressable as Pressable } from '@/src/components/ui/HapticPressable';
import { Screen } from '@/src/components/ui/Screen';
import { triggerLightHaptic } from '@/src/lib/haptics';
import { useSessionStore } from '@/src/store/sessionStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  danger?: boolean;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, setPreference } = useAppTheme();
  const logout = useSessionStore((s) => s.logout);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  async function signOut() {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Sign out failed', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'Account deletion needs a secure backend endpoint before it can permanently remove your Supabase user.',
      [{ text: 'OK' }]
    );
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="display">Settings</AppText>
        <AppText variant="body" muted style={styles.subtitle}>
          Manage your experience, privacy, and account.
        </AppText>
      </View>

      <SettingsSection title="Preferences">
        <SettingsRow
          icon="notifications-outline"
          label="Notifications"
          color={colors.info}
          value={notificationsEnabled}
          onValueChange={(value) => {
            triggerLightHaptic();
            setNotificationsEnabled(value);
          }}
        />
        <SettingsRow
          icon="color-palette-outline"
          label="Appearance"
          color={colors.primary}
          value={isDark}
          onValueChange={(enabled) => {
            triggerLightHaptic();
            setPreference(enabled ? 'dark' : 'light');
          }}
        />
        <SettingsRow
          icon="calendar-outline"
          label="Calendar Settings"
          color={colors.textMuted}
          onPress={() => Alert.alert('Calendar Settings', 'Calendar integrations are coming soon.')}
        />
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Privacy & Security"
          color={colors.success}
          onPress={() => router.push('/privacy-security' as never)}
        />
        <SettingsRow
          icon="document-text-outline"
          label="Privacy Policy"
          color={colors.info}
          onPress={() => router.push('/privacy-policy' as never)}
        />
        <SettingsRow
          icon="help-circle-outline"
          label="Help & Support"
          color={colors.accentGold}
          onPress={() => router.push('/help-support' as never)}
        />
        <SettingsRow
          icon="log-out-outline"
          label="Sign Out"
          color={colors.error}
          danger
          onPress={confirmSignOut}
        />
        <SettingsRow
          icon="trash-outline"
          label="Delete Account"
          color={colors.error}
          danger
          onPress={confirmDeleteAccount}
        />
      </SettingsSection>
    </Screen>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.section}>
      <AppText variant="label" style={[styles.sectionTitle, { color: colors.textMuted }]}>
        {title.toUpperCase()}
      </AppText>
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  color,
  danger,
  value,
  onValueChange,
  onPress,
}: SettingsRowProps) {
  const { colors } = useAppTheme();
  const isSwitch = typeof value === 'boolean' && onValueChange;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, opacity: pressed ? 0.86 : 1 },
      ]}>
      <Ionicons name={icon} size={21} color={color} />
      <AppText
        variant="body"
        style={[styles.rowLabel, { color: danger ? colors.error : colors.text }]}>
        {label}
      </AppText>
      <View style={styles.accessory}>
        {isSwitch ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.borderMuted, true: colors.primary }}
            thumbColor={colors.textInverse}
            ios_backgroundColor={colors.borderMuted}
            style={styles.switch}
          />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontWeight: '800',
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  group: {
    borderWidth: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  row: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    flex: 1,
    fontWeight: '800',
  },
  accessory: {
    width: 58,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  switch: {
    marginRight: -4,
  },
});
