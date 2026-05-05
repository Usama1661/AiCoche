import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInRight,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { AppText } from '@/src/components/ui/AppText';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { Screen } from '@/src/components/ui/Screen';
import { AppHeader } from '@/src/components/layout/AppHeader';
import { LockedSection } from '@/src/components/subscription/LockedSection';
import { UpgradeSheet } from '@/src/components/subscription/UpgradeSheet';
import { analyzeCv } from '@/src/lib/api/cv';
import { buildUserProfileFromStores } from '@/src/lib/buildUserProfile';
import type { CvAnalysis } from '@/src/types/cv';
import { useMetricsStore } from '@/src/store/metricsStore';
import { useProfileStore } from '@/src/store/profileStore';
import { useUsageStore } from '@/src/store/usageStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

export default function CvAnalysisScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const lastCvDocumentId = useMetricsStore((s) => s.lastCvDocumentId);
  const lastCvText = useMetricsStore((s) => s.lastCvText);
  const lastAnalysis = useMetricsStore((s) => s.lastAnalysis);
  const setLastAnalysis = useMetricsStore((s) => s.setLastAnalysis);
  const setLastCvScore = useMetricsStore((s) => s.setLastCvScore);
  const loadRemoteProfile = useProfileStore((s) => s.loadRemoteProfile);
  const canAnalyze = useUsageStore((s) => s.canAnalyzeCv());
  const incrementCvAnalysis = useUsageStore((s) => s.incrementCvAnalysis);
  const plan = useUsageStore((s) => s.plan);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CvAnalysis | null>(lastAnalysis);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const run = useCallback(async () => {
    if (!lastCvDocumentId && !lastCvText.trim()) {
      setError('No uploaded CV available. Upload a CV first.');
      return;
    }
    if (!canAnalyze) {
      setUpgradeOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const profile = buildUserProfileFromStores();
      const data = await analyzeCv({
        cvDocumentId: lastCvDocumentId ?? undefined,
        cvText: lastCvText,
        profile,
      });
      setResult(data);
      setLastAnalysis(data);
      if (data.overallScore != null) setLastCvScore(data.overallScore);
      await loadRemoteProfile();
      incrementCvAnalysis();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [
    lastCvText,
    lastCvDocumentId,
    canAnalyze,
    setLastAnalysis,
    setLastCvScore,
    loadRemoteProfile,
    incrementCvAnalysis,
  ]);

  useEffect(() => {
    if (lastAnalysis) {
      setResult(lastAnalysis);
      return;
    }
    if (!lastCvDocumentId && !lastCvText.trim()) {
      setError('Upload a CV first, then open analysis again.');
      return;
    }
    run();
    // Intentional: run once on mount to match “open analysis” flow
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = result;

  return (
    <Screen>
      <AppHeader title="CV analysis" onBack={() => router.back()} />
      {error ? <ErrorBanner message={error} /> : null}
      <View style={styles.actionRow}>
        <Button
          title="Upload improved CV"
          variant="secondary"
          onPress={() => router.push('/cv-upload')}
          style={styles.topActionButton}
        />
      </View>

      <LockedSection
        locked={plan === 'free' && !canAnalyze}
        onUpgrade={() => setUpgradeOpen(true)}
        title="CV analysis limit reached">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <AnalyzingState />
          ) : data ? (
            <View style={{ gap: spacing.lg }}>
              <Animated.View entering={FadeInUp.delay(40).duration(520)}>
              <Card style={[styles.scoreCard, { backgroundColor: colors.elevated }]}>
                <LinearGradient
                  colors={colors.heroGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={[styles.heroGlow, { backgroundColor: colors.primaryTint }]} />
                <View style={styles.scoreTop}>
                  <View style={[styles.scoreIcon, { backgroundColor: colors.primaryTint }]}>
                    <Ionicons name="document-text-outline" size={26} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="title">Resume readiness</AppText>
                    <AppText variant="body" muted style={styles.helperText}>
                      Structured feedback for strengths, weak points, and next improvements.
                    </AppText>
                  </View>
                  {data.overallScore != null ? (
                    <Animated.View
                      entering={ZoomIn.delay(260).duration(420)}
                      style={[
                        styles.scoreBubble,
                        { backgroundColor: colors.successTint, borderColor: colors.success },
                      ]}>
                      <AppText variant="subtitle" style={{ color: colors.success }}>
                        {data.overallScore}
                      </AppText>
                      <AppText variant="caption" style={{ color: colors.success, fontWeight: '900' }}>
                        score
                      </AppText>
                    </Animated.View>
                  ) : null}
                </View>
                {data.overallScore != null ? (
                  <View style={[styles.scoreTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.scoreFill,
                        {
                          width: `${Math.max(0, Math.min(100, data.overallScore))}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </Card>
              </Animated.View>

              <AnimatedSection delay={120}>
                <AnalysisSection
                title="Strengths"
                subtitle="What is already working well"
                icon="checkmark-circle-outline"
                color={colors.success}
                tint={colors.successTint}
                items={data.strengths}
                emptyText="No strengths returned yet. Retry analysis after improving CV text extraction."
              />
              </AnimatedSection>
              <AnimatedSection delay={200}>
                <AnalysisSection
                title="Weaknesses"
                subtitle="What is reducing your CV impact"
                icon="warning-outline"
                color={colors.error}
                tint={colors.errorTint}
                items={data.weaknesses}
                emptyText="No weaknesses found. Add more CV detail for deeper feedback."
              />
              </AnimatedSection>
              <AnimatedSection delay={280}>
                <AnalysisSection
                title="How to improve"
                subtitle="Apply these next steps first"
                icon="sparkles-outline"
                color={colors.primary}
                tint={colors.primaryTint}
                items={data.suggestions}
                emptyText="No suggestions returned yet."
                numbered
              />
              </AnimatedSection>
              <AnimatedSection delay={360}>
                <Card>
                <SectionHeader
                  title="Skills to add"
                  subtitle="Keywords and capabilities for your target role"
                  icon="construct-outline"
                  color={colors.accentGold}
                  tint={colors.warningTint}
                />
                <View style={styles.wrap}>
                  {data.missingSkills.length ? (
                    data.missingSkills.map((s) => <Badge key={s} label={s} tone="neutral" />)
                  ) : (
                    <AppText variant="body" muted>
                      No missing skills returned.
                    </AppText>
                  )}
                </View>
              </Card>
              </AnimatedSection>
              <Animated.View entering={FadeInUp.delay(430).duration(520)} style={styles.bottomActions}>
                <Button title="Retry analysis" variant="secondary" onPress={run} loading={loading} />
                <Button title="Improve Profile" onPress={() => router.replace('/(tabs)' as never)} />
              </Animated.View>
            </View>
          ) : (
            <AppText variant="body" muted>
              No analysis yet.
            </AppText>
          )}
        </ScrollView>
      </LockedSection>

      <UpgradeSheet visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </Screen>
  );
}

function AnimatedSection({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(520)}>
      {children}
    </Animated.View>
  );
}

function AnalyzingState() {
  const { colors } = useAppTheme();
  const orbit = useSharedValue(0);
  const pulse = useSharedValue(1);
  const scan = useSharedValue(0);
  const steps = [
    'Reading CV structure',
    'Finding strengths and gaps',
    'Building improvement plan',
  ];

  useEffect(() => {
    orbit.value = withRepeat(
      withTiming(360, { duration: 2600, easing: Easing.linear }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 780, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.96, { duration: 780, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    scan.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [orbit, pulse, scan]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value}deg` }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const scanStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + scan.value * 0.45,
    transform: [{ translateY: -42 + scan.value * 84 }],
  }));

  return (
    <View style={styles.analyzingWrap}>
      <Animated.View entering={ZoomIn.duration(520)} style={styles.analyzingHero}>
        <LinearGradient
          colors={colors.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View
          style={[
            styles.scanHalo,
            { borderColor: colors.primary, backgroundColor: colors.primaryTint },
          ]}
        />
        <Animated.View style={[styles.scanLine, { backgroundColor: colors.primary }, scanStyle]} />
        <Animated.View style={[styles.scanOrbit, { borderColor: colors.glow }, orbitStyle]}>
          <View style={[styles.orbitDot, { backgroundColor: colors.secondaryPink }]} />
        </Animated.View>
        <Animated.View style={[styles.scanCore, { backgroundColor: colors.primaryTint }, pulseStyle]}>
          <Ionicons name="scan-outline" size={38} color={colors.primary} />
        </Animated.View>
        <AppText variant="title" style={styles.analyzingTitle}>
          Analyzing your CV
        </AppText>
        <AppText variant="body" muted style={styles.analyzingText}>
          AiCoche is reading your experience, skills, and role fit.
        </AppText>
      </Animated.View>

      {steps.map((step, index) => (
        <Animated.View
          key={step}
          entering={FadeInRight.delay(180 + index * 120).duration(480)}
          style={[styles.analysisStep, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.stepDot, { backgroundColor: colors.primaryTint }]}>
            <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
          </View>
          <AppText variant="body" style={styles.stepText}>
            {step}
          </AppText>
        </Animated.View>
      ))}
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
  color,
  tint,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText variant="caption" muted style={styles.helperText}>
          {subtitle}
        </AppText>
      </View>
    </View>
  );
}

function AnalysisSection({
  title,
  subtitle,
  icon,
  color,
  tint,
  items,
  emptyText,
  numbered,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
  items: string[];
  emptyText: string;
  numbered?: boolean;
}) {
  return (
    <Card>
      <SectionHeader title={title} subtitle={subtitle} icon={icon} color={color} tint={tint} />
      <View style={styles.list}>
        {items.length ? (
          items.map((item, index) => (
            <View key={`${title}-${item}`} style={styles.listItem}>
              <View style={[styles.bullet, { backgroundColor: tint }]}>
                <AppText variant="caption" style={{ color, fontWeight: '900' }}>
                  {numbered ? index + 1 : '•'}
                </AppText>
              </View>
              <AppText variant="body" style={styles.itemText}>
                {item}
              </AppText>
            </View>
          ))
        ) : (
          <AppText variant="body" muted>
            {emptyText}
          </AppText>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  topActionButton: { flex: 1 },
  scrollContent: {
    paddingBottom: spacing.xxl + spacing.lg,
  },
  scoreCard: { gap: spacing.md, overflow: 'hidden' },
  scoreTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scoreIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBubble: {
    minWidth: 58,
    borderRadius: 18,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  heroGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -52,
    top: -56,
  },
  scoreTrack: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 99,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: { marginTop: spacing.xs, fontWeight: '700' },
  list: { gap: spacing.md },
  listItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  bullet: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemText: { flex: 1, lineHeight: 23 },
  bottomActions: {
    gap: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  analyzingWrap: { gap: spacing.md },
  analyzingHero: {
    minHeight: 280,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  scanOrbit: {
    top: 24,
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  scanHalo: {
    position: 'absolute',
    top: 48,
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
  },
  scanLine: {
    position: 'absolute',
    top: 100,
    width: 98,
    height: 2,
    borderRadius: 99,
  },
  orbitDot: {
    position: 'absolute',
    top: -5,
    left: 59,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scanCore: {
    position: 'absolute',
    top: 66,
    width: 78,
    height: 78,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingTitle: { textAlign: 'center', marginTop: spacing.xl },
  analyzingText: {
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '700',
  },
  analysisStep: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepDot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1, fontWeight: '800' },
});
