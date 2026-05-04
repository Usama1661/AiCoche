import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import type { CareerGoal, ExperienceLevel } from '@/src/types/user';
import type { Profession } from '@/src/lib/professions';
import { searchProfessions } from '@/src/lib/professions';
import { useProfileStore } from '@/src/store/profileStore';
import { useSessionStore } from '@/src/store/sessionStore';
import { useAppTheme } from '@/src/theme/ThemeProvider';
import { spacing } from '@/src/theme/tokens';

const EXPERIENCE: { id: ExperienceLevel; title: string; description: string }[] = [
  { id: 'beginner', title: 'Beginner', description: '0–1 years' },
  { id: 'intermediate', title: 'Intermediate', description: '1–3 years' },
  { id: 'experienced', title: 'Experienced', description: '3+ years' },
];

const GOALS: { id: CareerGoal; title: string; description: string }[] = [
  { id: 'job', title: 'Get a Job', description: 'briefcase-outline' },
  { id: 'switch', title: 'Switch Career', description: 'trending-up-outline' },
  { id: 'freelance', title: 'Freelancing', description: 'globe-outline' },
  { id: 'skills', title: 'Improve Skills', description: 'ribbon-outline' },
];

const LANGS = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Portuguese', 'Russian', 'Arabic', 'Hindi'] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [profession, setProfession] = useState<Profession | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [goal, setGoal] = useState<CareerGoal | null>(null);
  const [language, setLanguage] = useState('English');
  const [otherLang, setOtherLang] = useState('');

  const finishOnboarding = useProfileStore((s) => s.finishOnboarding);
  const logout = useSessionStore((s) => s.logout);
  const professions = useMemo(() => searchProfessions(query), [query]);

  function next() {
    if (step === 0 && !profession) return;
    if (step === 1 && !experience) return;
    if (step === 2 && !goal) return;
    if (step === 3) {
      const lang =
        language === 'Other' ? (otherLang.trim() || 'Other') : language;
      finishOnboarding({
        professionKey: profession!.key,
        professionLabel: profession!.label,
        experience: experience!,
        goal: goal!,
        language: lang,
      });
      // Go straight to tabs — avoids `app/index` reading stale `onboardingComplete` before persist re-renders
      router.replace('/(tabs)');
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    if (step === 0) {
      logout();
      router.replace('/(auth)/login');
      return;
    }
    setStep((s) => s - 1);
  }

  const canContinue =
    (step === 0 && profession) ||
    (step === 1 && experience) ||
    (step === 2 && goal) ||
    step === 3;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.inner}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${((step + 1) / 4) * 100}%` }]} />
        </View>
        <AppText variant="body" muted style={styles.stepLabel}>
          Step {step + 1} of 4
        </AppText>
        <AppText variant="display" style={styles.title}>
          {step === 0
            ? "What's your profession?"
            : step === 1
              ? 'Experience Level'
              : step === 2
                ? 'Career Goal'
                : 'Preferred Language'}
        </AppText>
        <AppText variant="body" muted style={styles.subtitle}>
          {step === 0
            ? 'Select the field you work in or aspire to work in'
            : step === 1
              ? 'How many years of experience do you have?'
              : step === 2
                ? 'What are you aiming to achieve?'
                : 'Choose the language for your coaching sessions'}
        </AppText>

        <Animated.View key={step} entering={FadeInRight.duration(240)} style={styles.content}>
          {step === 0 ? (
            <>
              <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={24} color={colors.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search professions..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.searchInput, { color: colors.text }]}
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {professions.slice(0, 14).map((p) => (
                  <ChoiceRow
                    key={p.key}
                    title={p.label}
                    selected={profession?.key === p.key}
                    onPress={() => setProfession(p)}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {step === 1 ? (
            <View style={{ gap: spacing.md }}>
              {EXPERIENCE.map((e) => (
                <ChoiceRow
                  key={e.id}
                  title={e.title}
                  right={e.description}
                  selected={experience === e.id}
                  onPress={() => setExperience(e.id)}
                />
              ))}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.goalGrid}>
              {GOALS.map((g) => (
                <GoalCard
                  key={g.id}
                  title={g.title}
                  icon={g.description as keyof typeof Ionicons.glyphMap}
                  selected={goal === g.id}
                  onPress={() => setGoal(g.id)}
                />
              ))}
            </View>
          ) : null}

          {step === 3 ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
              {LANGS.map((lang) => (
                <ChoiceRow
                  key={lang}
                  title={lang}
                  selected={language === lang}
                  showCheck
                  onPress={() => setLanguage(lang)}
                />
              ))}
              {language === 'Other' ? (
                <TextInput
                  value={otherLang}
                  onChangeText={setOtherLang}
                  placeholder="Specify language"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.other,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                />
              ) : null}
            </ScrollView>
          ) : null}
        </Animated.View>
      </View>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Pressable onPress={back} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Button
          title={step === 3 ? 'Get Started' : 'Continue'}
          onPress={next}
          disabled={!canContinue}
          style={styles.continueBtn}
          leftIcon={<Ionicons name="chevron-forward" size={22} color="#FFFFFF" />}
        />
      </View>
    </SafeAreaView>
  );
}

function ChoiceRow({
  title,
  right,
  selected,
  showCheck,
  onPress,
}: {
  title: string;
  right?: string;
  selected: boolean;
  showCheck?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? 'rgba(79,70,229,0.14)' : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}>
      <AppText variant="subtitle" style={{ flex: 1 }}>
        {title}
      </AppText>
      {right ? (
        <AppText variant="body" muted style={{ fontWeight: '900' }}>
          {right}
        </AppText>
      ) : null}
      {showCheck && selected ? (
        <View style={[styles.check, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

function GoalCard({
  title,
  icon,
  selected,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.goalCard,
        {
          backgroundColor: selected ? 'rgba(79,70,229,0.14)' : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}>
      <Ionicons name={icon} size={34} color={selected ? colors.primary : colors.textMuted} />
      <AppText variant="subtitle" style={{ textAlign: 'center', marginTop: spacing.md }}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
  },
  progressTrack: {
    height: 7,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#5548F3',
  },
  stepLabel: { fontWeight: '900', marginBottom: spacing.lg },
  title: { marginBottom: spacing.md },
  subtitle: { fontWeight: '800', marginBottom: spacing.xxxl },
  content: { flex: 1 },
  searchBox: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 16, fontWeight: '800' },
  choice: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  goalCard: {
    width: '48%',
    minHeight: 132,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  backBtn: { width: 54, height: 58, alignItems: 'center', justifyContent: 'center' },
  continueBtn: { flex: 1, minHeight: 66, flexDirection: 'row-reverse' },
  other: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    fontSize: 16,
    fontWeight: '800',
  },
});
