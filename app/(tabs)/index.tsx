import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { Screen } from '@/src/components/ui/Screen';
import { UpgradeSheet } from '@/src/components/subscription/UpgradeSheet';
import { useMetricsStore } from '@/src/store/metricsStore';
import { useSessionStore } from '@/src/store/sessionStore';
import { useUsageStore } from '@/src/store/usageStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const displayName = useSessionStore((s) => s.displayName) || 'Alex Developer';
  const lastCvScore = useMetricsStore((s) => s.lastCvScore);
  const lastInterviewScore = useMetricsStore((s) => s.lastInterviewScore);
  const lastQuizScore = useMetricsStore((s) => s.lastQuizScore);
  const lastQuizLevel = useMetricsStore((s) => s.lastQuizLevel);
  const plan = useUsageStore((s) => s.plan);
  const canAnalyze = useUsageStore((s) => s.canAnalyzeCv());
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View>
          <AppText variant="body" muted style={styles.welcome}>
            Welcome back,
          </AppText>
          <AppText variant="display">{displayName}</AppText>
        </View>
        <Pressable
          onPress={() => setUpgradeOpen(true)}
          style={[styles.planPill, { backgroundColor: 'rgba(79,70,229,0.16)' }]}>
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
          <AppText variant="caption" style={{ color: colors.primary, fontWeight: '900' }}>
            {plan === 'pro' ? 'Pro' : 'Free'}
          </AppText>
        </Pressable>
      </View>

      <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ScoreBlock
          icon="trending-up-outline"
          tint={colors.success}
          value={lastCvScore != null ? String(lastCvScore) : '78'}
          label="CV Score"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ScoreBlock
          icon="ribbon-outline"
          tint={colors.primary}
          value={lastInterviewScore != null ? String(lastInterviewScore) : '8.5'}
          label="Interview"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ScoreBlock
          icon="school-outline"
          tint="#F59E0B"
          value={lastQuizScore != null ? `${lastQuizScore}%` : 'New'}
          label={lastQuizLevel ?? 'AI Quiz'}
        />
      </View>

      <AppText variant="title" style={styles.sectionTitle}>
        Quick Actions
      </AppText>

      <View style={styles.grid}>
        <ActionCard
          title="Upload CV"
          subtitle="Update your resume"
          icon="cloud-upload-outline"
          color={colors.primary}
          onPress={() => router.push('/cv-upload')}
        />
        <ActionCard
          title="Analyze CV"
          subtitle="AI-powered review"
          icon="document-text-outline"
          color={colors.success}
          onPress={() => {
            if (!canAnalyze) {
              setUpgradeOpen(true);
              return;
            }
            router.push('/cv-analysis');
          }}
        />
        <ActionCard
          title="Start Interview"
          subtitle="Practice with AI"
          icon="chatbubble-outline"
          color="#F59E0B"
          onPress={() => router.push('/interview-session')}
        />
        <ActionCard
          title="AI Quiz"
          subtitle="Check your level"
          icon="school-outline"
          color="#8B5CF6"
          onPress={() => router.push('/(tabs)/quiz')}
        />
        <ActionCard
          title="Your Profile"
          subtitle="Career snapshot"
          icon="person-circle-outline"
          color="#0EA5E9"
          onPress={() => router.push('/professional-profile' as never)}
        />
        <ActionCard
          title="Upgrade Plan"
          subtitle="Unlock all features"
          icon="flash-outline"
          color={colors.primary}
          onPress={() => setUpgradeOpen(true)}
        />
      </View>

      <View style={[styles.tipCard, { borderColor: 'rgba(79,70,229,0.35)' }]}>
        <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle">Daily Tip</AppText>
          <AppText variant="body" muted style={{ marginTop: spacing.xs, fontWeight: '700' }}>
            Tailor your CV for each job application. Highlight relevant skills that match the job
            description to increase your chances.
          </AppText>
        </View>
      </View>

      <UpgradeSheet visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Screen>
  );
}

function ScoreBlock({
  icon,
  tint,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.scoreBlock}>
      <View style={[styles.scoreIcon, { backgroundColor: `${tint}18` }]}>
        <Ionicons name={icon} size={25} color={tint} />
      </View>
      <AppText variant="display" style={styles.scoreValue}>
        {value}
      </AppText>
      <AppText variant="body" muted style={styles.scoreLabel}>
        {label}
      </AppText>
    </View>
  );
}

function ActionCard({
  title,
  subtitle,
  icon,
  color,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
      ]}>
      <Ionicons name="chevron-forward" size={22} color={colors.textMuted} style={styles.chevron} />
      <View style={[styles.actionIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={29} color={color} />
      </View>
      <AppText variant="subtitle" style={styles.actionTitle}>
        {title}
      </AppText>
      <AppText variant="body" muted style={styles.actionSubtitle}>
        {subtitle}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  welcome: { fontWeight: '800', marginBottom: 2 },
  planPill: {
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  scoreCard: {
    borderWidth: 1,
    borderRadius: 20,
    minHeight: 166,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  scoreBlock: { flex: 1, alignItems: 'center' },
  scoreIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { marginTop: spacing.md, fontSize: 27, lineHeight: 34 },
  scoreLabel: { fontWeight: '800' },
  divider: { height: 98, width: 1 },
  sectionTitle: { marginBottom: spacing.lg },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  actionCard: {
    width: '48%',
    minHeight: 164,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.xl,
  },
  chevron: { position: 'absolute', top: spacing.lg, right: spacing.lg },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  actionTitle: { marginBottom: spacing.xs },
  actionSubtitle: { fontWeight: '700' },
  tipCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.xl,
    backgroundColor: 'rgba(49,46,129,0.24)',
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
});
