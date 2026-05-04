import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { Screen } from '@/src/components/ui/Screen';
import { useMetricsStore } from '@/src/store/metricsStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useUsageStore, FREE_CHAT_LIMIT } from '@/src/store/usageStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

export default function InterviewTabScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const professionLabel = useProfileStore((s) => s.professionLabel) || 'Mobile App Developer';
  const chatsUsed = useUsageStore((s) => s.chatsUsed);
  const lastInterviewScore = useMetricsStore((s) => s.lastInterviewScore) ?? 8.5;
  const progress = Math.min(1, chatsUsed / FREE_CHAT_LIMIT);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="display">Mock Interviews</AppText>
        <AppText variant="body" muted style={styles.sub}>
          Practice with AI and improve your skills
        </AppText>
      </View>

      <Pressable
        onPress={() => router.push('/interview-session')}
        style={({ pressed }) => [styles.hero, { opacity: pressed ? 0.9 : 1 }]}>
        <View style={styles.heroIcon}>
          <Ionicons name="chatbubble-outline" size={38} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" style={styles.heroTitle}>
            Start New Interview
          </AppText>
          <AppText variant="body" style={styles.heroText} numberOfLines={1}>
            AI-powered {professionLabel} interview
          </AppText>
        </View>
      </Pressable>

      <View style={styles.usageRow}>
        <AppText variant="body" muted style={styles.usageText}>
          Interviews used this month
        </AppText>
        <AppText variant="body" style={styles.usageValue}>
          {chatsUsed} / {FREE_CHAT_LIMIT}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${Math.max(progress, 0.3) * 100}%` }]} />
      </View>

      <AppText variant="title" style={styles.sectionTitle}>
        Past Sessions
      </AppText>

      <PastSession title="React & System Design" date="May 2, 2026" score={lastInterviewScore} />
      <PastSession title="JavaScript Fundamentals" date="Apr 28, 2026" score={7.2} />
      <PastSession title="Data Structures" date="Apr 25, 2026" score={9} />
    </Screen>
  );
}

function PastSession({ title, date, score }: { title: string; date: string; score: number }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.session,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}>
      <View style={styles.sessionIcon}>
        <Ionicons name="time-outline" size={24} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText variant="body" muted style={{ fontWeight: '700' }}>
          {date}
        </AppText>
      </View>
      <View style={styles.scorePill}>
        <Ionicons name="trophy-outline" size={16} color={colors.success} />
        <AppText variant="caption" style={{ color: colors.success, fontWeight: '900' }}>
          {score}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxl, marginBottom: spacing.xxl },
  sub: { marginTop: spacing.xs, fontWeight: '800' },
  hero: {
    minHeight: 120,
    borderRadius: 22,
    backgroundColor: '#5548F3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#FFFFFF', marginBottom: spacing.xs },
  heroText: { color: 'rgba(255,255,255,0.85)', fontWeight: '800' },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  usageText: { fontWeight: '800' },
  usageValue: { fontWeight: '900' },
  track: { height: 8, borderRadius: 99, overflow: 'hidden', marginBottom: spacing.xxl },
  fill: { height: '100%', borderRadius: 99, backgroundColor: '#5548F3' },
  sectionTitle: { marginBottom: spacing.lg },
  session: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(79,70,229,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePill: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(34,197,94,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
