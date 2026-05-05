import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { Skeleton } from '@/src/components/ui/Skeleton';
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
import { spacing } from '@/src/theme/tokens';

export default function CvAnalysisScreen() {
  const router = useRouter();
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
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Button title="Retry" variant="secondary" onPress={run} loading={loading} />
      </View>

      <LockedSection
        locked={plan === 'free' && !canAnalyze}
        onUpgrade={() => setUpgradeOpen(true)}
        title="CV analysis limit reached">
        <ScrollView showsVerticalScrollIndicator={false}>
          {loading && !data ? (
            <View style={{ gap: spacing.md }}>
              <Skeleton height={24} width="70%" />
              <Skeleton height={80} />
              <Skeleton height={80} />
            </View>
          ) : data ? (
            <View style={{ gap: spacing.lg }}>
              <Card>
                <AppText variant="subtitle" style={{ marginBottom: spacing.sm }}>
                  Strengths
                </AppText>
                <View style={styles.wrap}>
                  {data.strengths.map((s) => (
                    <Badge key={s} label={s} tone="success" />
                  ))}
                </View>
              </Card>
              <Card>
                <AppText variant="subtitle" style={{ marginBottom: spacing.sm }}>
                  Weaknesses
                </AppText>
                <View style={styles.wrap}>
                  {data.weaknesses.map((s) => (
                    <Badge key={s} label={s} tone="error" />
                  ))}
                </View>
              </Card>
              <Card>
                <AppText variant="subtitle" style={{ marginBottom: spacing.sm }}>
                  Missing skills
                </AppText>
                <View style={styles.wrap}>
                  {data.missingSkills.map((s) => (
                    <Badge key={s} label={s} tone="neutral" />
                  ))}
                </View>
              </Card>
              <Card>
                <AppText variant="subtitle" style={{ marginBottom: spacing.sm }}>
                  Suggestions
                </AppText>
                {data.suggestions.map((s) => (
                  <AppText key={s} variant="body" style={{ marginBottom: spacing.sm }}>
                    • {s}
                  </AppText>
                ))}
              </Card>
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

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
