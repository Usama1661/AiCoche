import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppText } from '@/src/components/ui/AppText';
import { HapticPressable as Pressable } from '@/src/components/ui/HapticPressable';
import { Screen } from '@/src/components/ui/Screen';
import { UpgradeSheet } from '@/src/components/subscription/UpgradeSheet';
import { useMetricsStore } from '@/src/store/metricsStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useSessionStore } from '@/src/store/sessionStore';
import { useUsageStore } from '@/src/store/usageStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

const NAME_EMOJIS = ['✨', '💜', '🌙', '⭐', '🌸', '🚀', '🌿', '🔥'];
const DAILY_MOTIVATIONS = [
  'Small steps compound into big career wins. Keep showing up today.',
  'Your next opportunity is built by the practice you do now.',
  'Progress is not always loud. Quiet consistency still counts.',
  'Every strong profile starts with one clear story about your value.',
  'You are closer than you think. Refine, practice, and keep moving.',
  'Confidence grows when preparation becomes a habit.',
  'Today is a good day to improve one answer, one skill, or one line on your CV.',
  'The work you do on yourself is never wasted.',
  'Your future role is looking for the proof you are building today.',
  'Stay patient with the process and serious about the next step.',
];

function getDailyMotivation() {
  const today = new Date();
  const key = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const seed = key.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return DAILY_MOTIVATIONS[seed % DAILY_MOTIVATIONS.length];
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const displayName = useSessionStore((s) => s.displayName);
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const professionLabel = useProfileStore((s) => s.professionLabel);
  const skills = useProfileStore((s) => s.skills);
  const tools = useProfileStore((s) => s.tools);
  const projects = useProfileStore((s) => s.projects);
  const professionalProfile = useProfileStore((s) => s.professionalProfile);
  const lastCvScore = useMetricsStore((s) => s.lastCvScore);
  const lastInterviewScore = useMetricsStore((s) => s.lastInterviewScore);
  const lastQuizScore = useMetricsStore((s) => s.lastQuizScore);
  const lastQuizLevel = useMetricsStore((s) => s.lastQuizLevel);
  const plan = useUsageStore((s) => s.plan);
  const canAnalyze = useUsageStore((s) => s.canAnalyzeCv());
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [nameEmoji] = useState(() => NAME_EMOJIS[Math.floor(Math.random() * NAME_EMOJIS.length)]);
  const [dailyMotivation] = useState(getDailyMotivation);
  const profileCompletion = Math.round(
    ([
      avatarUrl,
      professionLabel,
      professionalProfile.bio,
      skills.length > 0,
      tools.length > 0,
      projects.length > 0,
    ].filter(Boolean).length /
      6) *
      100
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerIdentity}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryTint, borderColor: colors.border }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person-outline" size={28} color={colors.primary} />
            )}
          </View>
          <View style={styles.nameBlock}>
            <AppText variant="body" muted style={styles.welcome}>
              Welcome back,
            </AppText>
            <View style={styles.nameRow}>
              <AppText variant="display" numberOfLines={1} style={styles.nameText}>
                {displayName}
              </AppText>
              <AppText variant="title" style={styles.nameEmoji}>
                {nameEmoji}
              </AppText>
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => setUpgradeOpen(true)}
          style={[styles.planPill, { backgroundColor: colors.primaryTint }]}>
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
          value={lastCvScore != null ? String(lastCvScore) : '—'}
          label="CV Score"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ScoreBlock
          icon="ribbon-outline"
          tint={colors.primary}
          value={lastInterviewScore != null ? String(lastInterviewScore) : '—'}
          label="Interview"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <ScoreBlock
          icon="school-outline"
          tint={colors.accentGold}
          value={lastQuizScore != null ? `${lastQuizScore}%` : '—'}
          label={lastQuizLevel ?? 'AI Quiz'}
        />
      </View>

      <View style={styles.profileCardWrap}>
        <ActionCard
          title={professionalProfile.fullName.trim() || displayName || 'CV name not added'}
          subtitle="Your Profile"
          meta="Career snapshot"
          icon="person-circle-outline"
          color={colors.info}
          onPress={() => router.push('/professional-profile' as never)}
          fullWidth
          rightContent={<ProfileBoost value={profileCompletion} />}
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
          color={colors.accentGold}
          onPress={() => router.push('/interview-session')}
        />
        <ActionCard
          title="AI Quiz"
          subtitle="Check your level"
          icon="school-outline"
          color={colors.primaryLight}
          onPress={() => router.push('/(tabs)/quiz')}
        />
      </View>

      <View style={[styles.tipCard, { borderColor: colors.glow, backgroundColor: colors.userBubble }]}>
        <Ionicons name="sparkles-outline" size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle">Daily Motivation</AppText>
          <AppText variant="body" muted style={{ marginTop: spacing.xs, fontWeight: '700' }}>
            {dailyMotivation}
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
  meta,
  icon,
  color,
  onPress,
  fullWidth,
  rightContent,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  fullWidth?: boolean;
  rightContent?: React.ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        fullWidth && styles.actionCardFull,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
      ]}>
      <Ionicons name="chevron-forward" size={22} color={colors.textMuted} style={styles.chevron} />
      {!fullWidth ? (
        <View style={[styles.actionIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={29} color={color} />
        </View>
      ) : null}
      <View style={fullWidth ? styles.fullCardBody : undefined}>
        <View style={[fullWidth ? styles.fullCardLeft : undefined]}>
          {fullWidth ? (
            <View style={[styles.actionIcon, styles.fullCardIcon, { backgroundColor: `${color}18` }]}>
              <Ionicons name={icon} size={26} color={color} />
            </View>
          ) : null}
          <View>
            <AppText
              variant="subtitle"
              numberOfLines={fullWidth ? 2 : 1}
              style={styles.actionTitle}>
              {title}
            </AppText>
            <AppText variant="body" muted style={styles.actionSubtitle}>
              {subtitle}
            </AppText>
            {meta ? (
              <AppText variant="caption" muted numberOfLines={1} style={styles.actionMeta}>
                {meta}
              </AppText>
            ) : null}
          </View>
        </View>
        {rightContent}
      </View>
    </Pressable>
  );
}

function ProfileBoost({ value }: { value: number }) {
  const { colors } = useAppTheme();
  const missing = Math.max(0, 6 - Math.round((value / 100) * 6));
  return (
    <View style={styles.profileBoost}>
      <View style={styles.profileBoostTop}>
        <View style={[styles.profileBadge, { backgroundColor: colors.primaryTint }]}>
          <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
        </View>
        <AppText variant="subtitle" style={{ color: colors.primary }}>
          {value}%
        </AppText>
      </View>
      <AppText variant="caption" style={[styles.profileBoostTitle, { color: colors.text }]}>
        Profile strength
      </AppText>
      <View style={[styles.profileTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.profileFill, { width: `${value}%`, backgroundColor: colors.primary }]} />
      </View>
      <View style={styles.profileChipRow}>
        <View style={[styles.profileChip, { backgroundColor: colors.successTint }]}>
          <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
          <AppText variant="caption" style={styles.profileChipText}>
            {Math.round((value / 100) * 6)}/6 done
          </AppText>
        </View>
        <View style={[styles.profileChip, { backgroundColor: colors.warningTint }]}>
          <Ionicons name="flash-outline" size={13} color={colors.accentGold} />
          <AppText variant="caption" style={styles.profileChipText}>
            {missing} left
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  nameBlock: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameText: { flexShrink: 1 },
  nameEmoji: { lineHeight: 30 },
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
  profileCardWrap: {
    marginBottom: spacing.xxl,
  },
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
  actionCardFull: {
    width: '100%',
    minHeight: 172,
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
  fullCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    marginBottom: spacing.md,
  },
  fullCardBody: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  fullCardLeft: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  actionTitle: { marginBottom: spacing.xs },
  actionSubtitle: { fontWeight: '700' },
  actionMeta: {
    marginTop: spacing.sm,
    fontWeight: '900',
  },
  profileBoost: {
    width: 150,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingTop: 50,
  },
  profileBoostTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileBadge: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBoostTitle: {
    fontWeight: '900',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  profileTrack: {
    width: '100%',
    height: 7,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  profileFill: {
    height: '100%',
    borderRadius: 99,
  },
  profileChipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  profileChip: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  profileChipText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
  },
  tipCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.xl,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
});
