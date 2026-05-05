import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { AppHeader } from '@/src/components/layout/AppHeader';
import { AppText } from '@/src/components/ui/AppText';
import { Screen } from '@/src/components/ui/Screen';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { radii, spacing } from '@/src/theme/tokens';

const FAQS = [
  {
    question: 'How do I improve my CV score?',
    answer: 'Upload your latest CV, review weaknesses, then add measurable outcomes, relevant skills, and role-specific projects.',
  },
  {
    question: 'How does interview practice work?',
    answer: 'AiCoche uses your selected profession and profile data to guide mock interview sessions and save progress.',
  },
  {
    question: 'Can I switch themes?',
    answer: 'Yes. Open Settings and use the Appearance toggle to switch between the dark and light visual styles.',
  },
] as const;

export default function HelpSupportScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <Screen scroll>
      <AppHeader
        title="Help & Support"
        subtitle="Answers and support for your career coach."
        onBack={() => router.back()}
      />

      <View style={[styles.supportCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.supportIcon, { backgroundColor: colors.warningTint }]}>
          <Ionicons name="heart-outline" size={32} color={colors.accentGold} />
        </View>
        <AppText variant="title">How can we help?</AppText>
        <AppText variant="body" muted style={styles.supportText}>
          Find quick answers below or contact support when you need help with your account,
          subscription, CV, or interview history.
        </AppText>
      </View>

      <ActionCard
        icon="mail-outline"
        title="Contact Support"
        description="Send a message to the AiCoche support team."
        color={colors.info}
        onPress={() => Alert.alert('Contact Support', 'Support email integration is coming soon.')}
      />
      <ActionCard
        icon="bug-outline"
        title="Report a Problem"
        description="Tell us about bugs, crashes, or unexpected behavior."
        color={colors.error}
        onPress={() => Alert.alert('Report a Problem', 'Bug reporting is coming soon.')}
      />

      <AppText variant="title" style={styles.faqTitle}>
        Frequently Asked Questions
      </AppText>

      {FAQS.map((item) => (
        <View
          key={item.question}
          style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppText variant="subtitle">{item.question}</AppText>
          <AppText variant="body" muted style={styles.answer}>
            {item.answer}
          </AppText>
        </View>
      ))}
    </Screen>
  );
}

function ActionCard({
  icon,
  title,
  description,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 },
      ]}>
      <View style={[styles.actionIcon, { backgroundColor: colors.primaryTint }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText variant="caption" muted style={styles.actionText}>
          {description}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  supportCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  supportIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  supportText: {
    marginTop: spacing.sm,
    fontWeight: '700',
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    marginTop: spacing.xs,
    fontWeight: '800',
  },
  faqTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  faqCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  answer: {
    marginTop: spacing.sm,
    fontWeight: '700',
  },
});
