import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/src/components/layout/AppHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Screen } from '@/src/components/ui/Screen';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

const POLICY_SECTIONS = [
  {
    icon: 'person-circle-outline',
    title: 'Information we collect',
    body: 'We store account details, profile fields, CV content you upload, quiz progress, interview sessions, and usage limits needed to run AiCoche.',
  },
  {
    icon: 'sparkles-outline',
    title: 'How we use your data',
    body: 'Your data is used to personalize CV analysis, interview practice, quiz recommendations, and career coaching feedback.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'How we protect it',
    body: 'We rely on Supabase authentication and database controls. Sensitive account actions should be completed through secure backend endpoints.',
  },
  {
    icon: 'share-social-outline',
    title: 'Sharing',
    body: 'We do not sell your data. Data is only shared with services required to provide app features, such as storage, authentication, and AI analysis.',
  },
  {
    icon: 'trash-outline',
    title: 'Deletion',
    body: 'You can request deletion from Settings. Permanent account deletion requires a secure server-side flow before it can remove your Supabase user.',
  },
] as const;

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <Screen scroll>
      <AppHeader
        title="Privacy Policy"
        subtitle="Simple, transparent data practices."
        onBack={() => router.back()}
      />

      <View style={[styles.notice, { backgroundColor: colors.primaryTint, borderColor: colors.glow }]}>
        <Ionicons name="document-text-outline" size={28} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle">AiCoche Privacy Policy</AppText>
          <AppText variant="caption" muted style={styles.noticeText}>
            Last updated: May 5, 2026
          </AppText>
        </View>
      </View>

      {POLICY_SECTIONS.map((section) => (
        <View
          key={section.title}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryTint }]}>
            <Ionicons name={section.icon} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle">{section.title}</AppText>
            <AppText variant="body" muted style={styles.body}>
              {section.body}
            </AppText>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  noticeText: {
    marginTop: spacing.xs,
    fontWeight: '800',
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    marginTop: spacing.xs,
    fontWeight: '700',
  },
});
