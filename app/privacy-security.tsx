import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/src/components/layout/AppHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Screen } from '@/src/components/ui/Screen';
import { useSessionStore } from '@/src/store/sessionStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const email = useSessionStore((s) => s.email);

  return (
    <Screen scroll>
      <AppHeader
        title="Privacy & Security"
        subtitle="Control how your account and data are protected."
        onBack={() => router.back()}
      />

      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name="shield-checkmark-outline" size={34} color={colors.primary} />
        </View>
        <AppText variant="title">Your data stays personal</AppText>
        <AppText variant="body" muted style={styles.heroText}>
          AiCoche uses your profile, CV, quiz, and interview data only to personalize your career
          coaching experience.
        </AppText>
      </View>

      <SettingsGroup title="Account Security">
        <InfoRow
          icon="mail-outline"
          label="Signed in email"
          value={email || 'No email found'}
          color={colors.info}
        />
        <ActionRow
          icon="key-outline"
          label="Change password"
          description="Password reset flow coming soon."
          color={colors.primary}
          onPress={() => Alert.alert('Change password', 'Password reset will be available soon.')}
        />
        <ActionRow
          icon="log-in-outline"
          label="Active sessions"
          description="Review signed-in devices."
          color={colors.success}
          onPress={() => Alert.alert('Active sessions', 'Device management is coming soon.')}
        />
      </SettingsGroup>

      <SettingsGroup title="Data Controls">
        <ActionRow
          icon="cloud-download-outline"
          label="Export my data"
          description="Download profile, quiz, and interview history."
          color={colors.accentGold}
          onPress={() => Alert.alert('Export data', 'Data export is coming soon.')}
        />
        <ActionRow
          icon="trash-outline"
          label="Request account deletion"
          description="Requires secure backend deletion before permanent removal."
          color={colors.error}
          danger
          onPress={() =>
            Alert.alert(
              'Delete account',
              'Permanent Supabase account deletion needs a secure backend endpoint before this action can be completed.'
            )
          }
        />
      </SettingsGroup>
    </Screen>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.groupWrap}>
      <AppText variant="label" style={[styles.groupTitle, { color: colors.textMuted }]}>
        {title.toUpperCase()}
      </AppText>
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={22} color={color} />
      <View style={styles.rowText}>
        <AppText variant="body" style={styles.rowLabel}>
          {label}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  description,
  color,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  color: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, opacity: pressed ? 0.86 : 1 },
      ]}>
      <Ionicons name={icon} size={22} color={color} />
      <View style={styles.rowText}>
        <AppText variant="body" style={[styles.rowLabel, danger && { color: colors.error }]}>
          {label}
        </AppText>
        <AppText variant="caption" muted>
          {description}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroText: {
    marginTop: spacing.sm,
    fontWeight: '700',
  },
  groupWrap: {
    marginBottom: spacing.xxl,
  },
  groupTitle: {
    marginBottom: spacing.sm,
  },
  group: {
    borderWidth: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  row: {
    minHeight: 70,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontWeight: '900',
    marginBottom: 2,
  },
});
